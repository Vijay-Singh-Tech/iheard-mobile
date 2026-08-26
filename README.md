# iHeard MVP

iHeard is a voice-first caregiver support MVP for iPhone and Apple Watch. The project currently provides the mobile foundation and an initial Supabase client connection; product features will be built incrementally.

## Technology stack

- Expo SDK 57 and React Native 0.86
- React 19
- TypeScript with strict type checking
- Supabase JavaScript client
- npm
- Expo Application Services (EAS) project configuration

## Prerequisites

- macOS with Xcode and an installed iOS Simulator
- Node.js 22.13 or newer
- npm
- Expo CLI, used through `npx expo`
- CocoaPods for native iOS dependencies

## Setup

Install dependencies:

```sh
npm install
```

Create `.env.local` in the project root:

```sh
cp /dev/null .env.local
```

Add the required public Supabase configuration using your own project values:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never place a Supabase service-role key or another private secret in an `EXPO_PUBLIC_*` variable. `.env.local` is ignored by Git.

## Run on iOS

Start Expo and open the app in the iOS Simulator:

```sh
npm run ios
```

Xcode must be installed and configured. If native iOS projects are generated later, install their dependencies with CocoaPods as required by the Expo workflow.

## Supabase status

The Supabase client is initialized from the two environment variables above. On startup, the app currently calls `supabase.auth.getSession()` and logs the result. This confirms that client initialization and local session access work, but it is not yet a full backend connectivity or authentication test.

## GitHub workflow

1. Pull the latest `main` branch.
2. Create a short-lived feature branch.
3. Make and locally verify focused changes.
4. Commit with a clear message and push the feature branch.
5. Open a pull request for review before merging into `main`.

Do not commit `.env.local`, credentials, generated Expo state, dependencies, or generated native folders.

## Planned modules

Apple Watch support, HealthKit integration, voice AI, authentication, and other caregiver product features will be added in later modules.
