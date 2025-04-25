# AWS Bedrock Image Generator

A web application for generating images using various AWS Bedrock image generation models, including Stable Diffusion 3.5 Large, Titan Image Generator, and more.

## Features

- Support for multiple AWS Bedrock image generation models:
  - Stable Diffusion 3.5 Large
  - Titan Image Generator G1 v2
  - Titan Image Generator G1
  - Stable Image Core v1.1
  - Stable Image Ultra v1.1
  - SD3 Large 1.0
  - Stable Image Core v1.0
  - Stable Image Ultra v1.0
  - SDXL 1.0
- Generate images based on text prompts
- Support for negative prompts
- Image download functionality
- Beautiful and responsive user interface

## Prerequisites

- Node.js (version 16 or higher)
- AWS account with Bedrock access
- AWS access key and secret key with Bedrock permissions
- Access to image generation models in AWS Bedrock (must request access in AWS Bedrock console)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd aws-bedrock-image-generator
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure AWS credentials:
   - Create a `config.env` file in the root directory
   - Add your AWS credentials:
   ```
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   AWS_REGION=us-west-2
   PORT=3000
   ```

   Note: AWS region must be `us-west-2` as most of the image generation models are only available in US West (Oregon).

## Important: Request Model Access

Before using this application, you must request access to the models in the AWS Bedrock console:

1. Go to the AWS Bedrock console
2. Navigate to Model access in the left sidebar
3. Find and request access to the models you want to use:
   - Stability AI models (Stable Diffusion 3.5, Stable Image Core, etc.)
   - Amazon models (Titan Image Generator)
4. Wait for access approval before using the models

## Usage

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Select a model from the dropdown menu

4. Enter a prompt and optional settings:
   - Write a detailed prompt describing the image you want
   - Add negative prompts to specify what you don't want in the image

5. Click "Generate Image" and wait for the process to complete

6. Download the generated image or create a new one

## Supported Models and IDs

| Model Name                  | Model ID                           |
|----------------------------|-----------------------------------|
| Stable Diffusion 3.5 Large | stability.sd3-5-large-v1:0        |
| Titan Image Generator G1 v2| amazon.titan-image-generator-v2:0 |
| Titan Image Generator G1   | amazon.titan-image-generator-v1   |
| Stable Image Core v1.1     | stability.stable-image-core-v1:1  |
| Stable Image Ultra v1.1    | stability.stable-image-ultra-v1:1 |
| SD3 Large 1.0              | stability.sd3-large-v1:0          |
| Stable Image Core v1.0     | stability.stable-image-core-v1:0  |
| Stable Image Ultra v1.0    | stability.stable-image-ultra-v1:0 |
| SDXL 1.0                   | stability.stable-diffusion-xl-v1  |

## Technical Details

- Each model requires different request and response formats, which are handled automatically
- All models are currently only available in the US West (Oregon) region (`us-west-2`)
- Some models might be in legacy state or scheduled for retirement

## Troubleshooting

- If you encounter a "The provided model identifier is invalid" error, ensure you've:
  1. Requested and received access to the specific model in the AWS Bedrock console
  2. Are using the correct region (`us-west-2`)
  3. Have the correct model ID in your request
  
- If you get authentication errors, check that your AWS credentials have the necessary Bedrock permissions

## License

This project is licensed under the MIT License - see the LICENSE file for details. 