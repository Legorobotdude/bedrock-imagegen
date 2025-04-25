import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import sharp from 'sharp';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Load environment variables
dotenv.config({ path: './config.env' });

// Create directory for generated images if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesDir = path.join(__dirname, '..', 'public', 'images');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Set up multer for form handling
const upload = multer();

// Initialize the AWS Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
});

// Get friendly name for a model ID
function getModelFriendlyName(modelId) {
  const modelNames = {
    'stability.sd3-5-large-v1:0': 'Stable Diffusion 3.5 Large',
    'amazon.titan-image-generator-v2:0': 'Titan Image Generator G1 v2',
    'amazon.titan-image-generator-v1': 'Titan Image Generator G1',
    'stability.stable-image-core-v1:1': 'Stable Image Core v1.1',
    'stability.stable-image-ultra-v1:1': 'Stable Image Ultra v1.1',
    'stability.sd3-large-v1:0': 'SD3 Large 1.0',
    'stability.stable-image-core-v1:0': 'Stable Image Core v1.0',
    'stability.stable-image-ultra-v1:0': 'Stable Image Ultra v1.0',
    'stability.stable-diffusion-xl-v1': 'SDXL 1.0'
  };
  
  return modelNames[modelId] || modelId;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.post('/generate-image', upload.none(), async (req, res) => {
  try {
    const { prompt, negativePrompt = '', width = 1024, height = 1024, modelId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!modelId) {
      return res.status(400).json({ error: 'Model ID is required' });
    }

    const modelName = getModelFriendlyName(modelId);
    console.log(`---------------------------------------------`);
    console.log(`Processing request with model: ${modelName} (${modelId})`);
    console.log(`Prompt: "${prompt}"`);
    if (negativePrompt) console.log(`Negative prompt: "${negativePrompt}"`);
    console.log(`Dimensions: ${width}x${height}`);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `image_${timestamp}.png`;
    const outputPath = path.join(imagesDir, filename);

    // Prepare the request payload based on the model selected
    let payload;
    let payloadType = '';
    
    // Determine which model provider is being used
    if (modelId.startsWith('stability.')) {
      // Stability AI models (Stable Diffusion 3.5, SDXL, etc.)
      if (modelId === 'stability.stable-diffusion-xl-v1') {
        // SDXL 1.0 format
        payloadType = 'SDXL';
        payload = {
          text_prompts: [
            {
              text: prompt,
              weight: 1.0
            }
          ],
          cfg_scale: 7,
          steps: 50,
          width: parseInt(width),
          height: parseInt(height)
        };
        
        // Add negative prompt if provided
        if (negativePrompt) {
          payload.text_prompts.push({
            text: negativePrompt,
            weight: -1.0
          });
        }
      } else if (modelId === 'stability.sd3-large-v1:0') {
        // SD3 Large 1.0 format
        payloadType = 'SD3';
        payload = {
          prompt: prompt,
          mode: "text-to-image",
          aspect_ratio: "1:1",
          output_format: "png"
        };
        
        // Set appropriate aspect ratio based on width and height
        if (width > height) {
          payload.aspect_ratio = "16:9";
        } else if (width < height) {
          payload.aspect_ratio = "9:16";
        }
        
        // Add negative prompt if provided
        if (negativePrompt) {
          payload.negative_prompt = negativePrompt;
        }
      } else {
        // SD 3.5, Stable Image Core, Stable Image Ultra format
        payloadType = 'SD3.5/Image Core/Ultra';
        payload = {
          prompt: prompt,
          mode: "text-to-image",
          aspect_ratio: "1:1",
          output_format: "png"
        };
        
        // Add negative prompt if provided
        if (negativePrompt) {
          payload.negative_prompt = negativePrompt;
        }
      }
    } else if (modelId.startsWith('amazon.')) {
      // Amazon Titan models
      payloadType = 'Titan';
      payload = {
        taskType: "TEXT_IMAGE",
        textToImageParams: {
          text: prompt,
          negativeText: negativePrompt || undefined
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          height: parseInt(height),
          width: parseInt(width),
          cfgScale: 8
        }
      };
    }

    console.log(`Using payload format: ${payloadType}`);
    
    // Create the command for the model invocation
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to AWS Bedrock...');
    const startTime = Date.now();
    const response = await bedrockClient.send(command);
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000; // Convert to seconds

    console.log(`Response received in ${timeTaken.toFixed(2)} seconds`);

    // Process the response based on model type
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // For debugging purposes, log the shape of the response
    console.log('Response structure:', Object.keys(responseBody));
    
    // Extract image data from response based on model type
    let imageData;
    let responseType = '';

    if (modelId.startsWith('stability.')) {
      if (modelId === 'stability.stable-diffusion-xl-v1') {
        // SDXL 1.0 format
        responseType = 'artifacts array';
        if (responseBody.artifacts && responseBody.artifacts.length > 0) {
          console.log(`Found ${responseBody.artifacts.length} image(s) in artifacts array`);
          imageData = responseBody.artifacts[0].base64;
        }
      } else if (modelId === 'stability.sd3-large-v1:0') {
        // SD3 Large 1.0 format
        responseType = 'SD3 images array';
        if (responseBody.images && responseBody.images.length > 0) {
          console.log(`Found ${responseBody.images.length} image(s) in SD3 images array`);
          imageData = responseBody.images[0];
        }
      } else {
        // SD 3.5, Stable Image Core, Stable Image Ultra format
        responseType = 'images array';
        if (responseBody.images && responseBody.images.length > 0) {
          console.log(`Found ${responseBody.images.length} image(s) in images array`);
          imageData = responseBody.images[0];
        }
      }
    } else if (modelId.startsWith('amazon.')) {
      // Amazon Titan models
      responseType = 'Titan images array';
      if (responseBody.images && responseBody.images.length > 0) {
        console.log(`Found ${responseBody.images.length} image(s) in Titan response`);
        imageData = responseBody.images[0];
      }
    }

    console.log(`Response format used: ${responseType}`);

    if (!imageData) {
      console.error('Response body:', JSON.stringify(responseBody).substring(0, 500) + '...');
      throw new Error('No image data found in the response');
    }
    
    // Decode the base64 image and save it to a file
    const buffer = Buffer.from(imageData, 'base64');
    
    // Create metadata object with generation details
    const metadata = {
      model: modelName,
      modelId: modelId,
      prompt: prompt,
      timestamp: new Date().toISOString(),
      dimensions: `${width}x${height}`,
      generationTime: `${timeTaken.toFixed(2)}s`,
    };
    
    // Add negative prompt to metadata if provided
    if (negativePrompt) {
      metadata.negativePrompt = negativePrompt;
    }
    
    // Convert metadata to string for logging
    const metadataString = JSON.stringify(metadata, null, 2);
    console.log('Adding metadata to image:', metadataString);
    
    try {
      // Use sharp to add metadata and save image
      await sharp(buffer)
        .withMetadata({
          exif: {
            IFD0: {
              ImageDescription: `Generated by AWS Bedrock ${modelName}`,
              Software: 'AWS Bedrock Image Generator',
            },
            ExifIFD: {
              UserComment: metadataString,
            }
          }
        })
        .toFile(outputPath);
        
      console.log(`Image saved to ${outputPath} with metadata`);
    } catch (metadataError) {
      console.error('Error adding metadata, saving without metadata:', metadataError);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Image saved to ${outputPath} without metadata`);
    }
    
    console.log(`---------------------------------------------`);
    
    // Send the response with the image URL and additional model info
    res.json({
      success: true,
      imageUrl: `/images/${filename}`,
      model: {
        id: modelId,
        name: modelName,
        payloadType: payloadType,
        responseType: responseType,
        timeTaken: timeTaken.toFixed(2)
      },
      metadata: metadata,
      message: `Image generated successfully using ${modelName}`
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate image'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 