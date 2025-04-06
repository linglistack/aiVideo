const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const os = require('os');

// Create test images
async function createTestImages() {
  console.log('Starting FFmpeg debug test');
  
  // Create test directory
  const testDir = path.join(os.tmpdir(), 'aivideo_test-ffmpeg');
  const framesDir = path.join(testDir, 'frames');
  
  try {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(framesDir, { recursive: true });
    
    console.log(`Created test directories: ${testDir}`);
    
    // Create simple colored images
    const colors = ['red', 'green', 'blue', 'yellow', 'purple'];
    
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const frameFile = path.join(framesDir, `frame_${i.toString().padStart(3, '0')}.png`);
      
      // Create a simple colored image using FFmpeg
      try {
        const colorCmd = `ffmpeg -y -f lavfi -i color=${color}:s=600x400 -frames:v 1 "${frameFile}"`;
        console.log(`Creating test image: ${colorCmd}`);
        
        const { stdout, stderr } = await execPromise(colorCmd);
        console.log(`Created test image ${i} (${color})`);
      } catch (err) {
        console.error(`Error creating test image ${i}:`, err);
      }
    }
    
    // Try to create a video
    const outputVideoPath = path.join(testDir, 'test-output.mp4');
    
    try {
      // Try different FFmpeg approaches
      
      // Approach 1: Using pattern_type glob
      console.log('\nTrying Approach 1: pattern_type glob');
      const cmd1 = `ffmpeg -y -framerate 1/3 -pattern_type glob -i "${framesDir}/frame_*.png" -c:v libx264 -pix_fmt yuv420p -r 30 "${outputVideoPath}_1.mp4"`;
      console.log(`Running: ${cmd1}`);
      await execPromise(cmd1);
      
      // Approach 2: Using image2 with pattern
      console.log('\nTrying Approach 2: image2 with pattern');
      const cmd2 = `ffmpeg -y -f image2 -framerate 1/3 -i "${framesDir}/frame_%03d.png" -c:v libx264 -pix_fmt yuv420p "${outputVideoPath}_2.mp4"`;
      console.log(`Running: ${cmd2}`);
      await execPromise(cmd2);
      
      // Approach 3: Using a concat file
      console.log('\nTrying Approach 3: concat file');
      const concatFile = path.join(testDir, 'concat.txt');
      let concatContent = '';
      
      const files = await fs.readdir(framesDir);
      files.sort().forEach(file => {
        const fullPath = path.join(framesDir, file);
        concatContent += `file '${fullPath}'\nduration 3\n`;
      });
      concatContent += `file '${path.join(framesDir, files[files.length - 1])}'`;
      
      await fs.writeFile(concatFile, concatContent);
      console.log(`Created concat file:\n${concatContent}`);
      
      const cmd3 = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -pix_fmt yuv420p "${outputVideoPath}_3.mp4"`;
      console.log(`Running: ${cmd3}`);
      await execPromise(cmd3);
      
      console.log('\nAll approaches completed successfully!');
      
      // Check which files were created
      const testDirContents = await fs.readdir(testDir);
      console.log(`\nContents of test directory: ${testDirContents.join(', ')}`);
      
      // Get file sizes
      for (const file of testDirContents) {
        if (file.endsWith('.mp4')) {
          const stats = await fs.stat(path.join(testDir, file));
          console.log(`${file}: ${stats.size} bytes`);
        }
      }
      
    } catch (ffmpegError) {
      console.error('FFmpeg video creation error:', ffmpegError);
      console.error('Stderr:', ffmpegError.stderr);
    }
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

createTestImages().then(() => {
  console.log('Debug test completed');
}).catch(err => {
  console.error('Error in main process:', err);
}); 