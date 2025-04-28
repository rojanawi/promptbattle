# Prompt Battle

A real-time web application for hosting and participating in AI image generation battles using React, Vite, TypeScript, and Firebase.

## Features

- Create and join battles with unique battle codes
- Real-time prompt submissions and image generation
- Live voting system
- Role-based access (Host, Contestant, Spectator)
- Battle chat system
- Automatic topic generation using GPT-4
- Image generation using DALL-E 3

## Prerequisites

- Node.js 16+
- npm or yarn
- Firebase project with Realtime Database enabled
- OpenAI API key (for hosts)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/promptbattle.git
cd promptbattle
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_DATABASE_URL=your_database_url_here
```

4. Start the development server:
```bash
npm run dev
```

## Usage

### Creating a Battle

1. Enter your display name on the home page
2. Click "Create Battle"
3. Fill in the battle details and your OpenAI API key
4. Share the generated battle code with participants

### Joining a Battle

1. Enter your display name on the home page
2. Click "Join Battle"
3. Enter the battle code
4. Choose your role (Contestant or Spectator)

### During the Battle

#### Host
- Start each round
- Monitor prompt submissions
- Generate images from prompts using DALL-E
- End rounds and manage the battle flow

#### Contestants
- Submit prompts based on the given topic
- Vote for their favorite submissions (if enabled)
- View results and scores

#### Spectators
- Watch the battle in real-time
- Vote for their favorite submissions (if enabled)
- View results

## Development

### Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── config/        # Configuration files
  ├── hooks/         # Custom React hooks
  ├── pages/         # Page components
  ├── services/      # Firebase and OpenAI services
  ├── types/         # TypeScript type definitions
  └── utils/         # Utility functions
```

### Firebase Security Rules

Add these security rules to your Firebase Realtime Database:

```json
{
  "rules": {
    "battles": {
      "$battleId": {
        ".read": true,
        ".write": "auth != null",
        "participants": {
          "$userId": {
            ".write": "$userId === auth.uid"
          }
        },
        "rounds": {
          "$roundId": {
            "submissions": {
              "$userId": {
                ".write": "$userId === auth.uid"
              }
            },
            "votes": {
              "$userId": {
                ".write": "$userId === auth.uid"
              }
            }
          }
        },
        "messages": {
          ".write": "auth != null"
        }
      }
    },
    "users": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    },
    "activeBattles": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
