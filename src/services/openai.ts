import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Since we're using it in the frontend
    });
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await this.client.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      });

      if (!response.data?.[0]?.url) {
        throw new Error('No image URL received from OpenAI');
      }

      return response.data[0].url;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  async generateTopic(): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a creative prompt battle topic generator. Generate a single interesting, creative, and challenging topic for participants to create AI art about. The topic should be specific enough to be interesting but open-ended enough to allow for creative interpretation. Return ONLY the topic, nothing else."
          },
          {
            role: "user",
            content: "Generate a topic for the next round."
          }
        ],
        temperature: 1,
        max_tokens: 50,
      });

      return completion.choices[0]?.message?.content || 'A mysterious journey';
    } catch (error) {
      console.error('Error generating topic:', error);
      throw error;
    }
  }
} 