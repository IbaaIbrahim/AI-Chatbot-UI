# Development Guide

## Running in Development Mode

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Mode

This will watch for changes in TypeScript and SCSS files and automatically rebuild:

```bash
npm run dev
```

Or use the alias:

```bash
npm run watch
```

This will:
- Watch TypeScript files and compile to both CommonJS and ES modules
- Watch SCSS files and compile to CSS
- Automatically rebuild when you make changes

### 3. Testing the Library Locally

To test the library in another project during development, follow these steps:

#### Option A: Using npm/yarn link (Recommended for Development)

**Choose npm or yarn based on what your test project uses:**

##### Using npm link:

1. **First, build the library once** (to create the `dist` folder):
   ```bash
   npm run build
   ```

2. **In the library directory** (this project), create a global symlink:
   ```bash
   npm link
   ```
   This creates a global symlink to your library package.

3. **In your test/example project** (the project where you want to use the library):
   ```bash
   npm link @flowdit/chatbot-library
   ```
   This links your test project to the global symlink.

4. **Start development mode** in the library (keep this running):
   ```bash
   npm run dev
   ```
   This will watch for changes and automatically rebuild TypeScript and SCSS files.

5. **In your test project**, import and use the library:
   ```tsx
   // Import the library
   import { FullScreenChat, ChatbotProvider, initializeAPI } from '@flowdit/chatbot-library'
   import '@flowdit/chatbot-library/dist/styles.css'
   
   // Initialize API (if needed)
   initializeAPI({
     baseURL: 'https://your-api-url.com',
     token: 'your-token'
   })
   
   // Use in your component
   function App() {
     return (
       <ChatbotProvider>
         <FullScreenChat />
       </ChatbotProvider>
     )
   }
   ```

6. **Start your test project's dev server** (e.g., `npm start`, `npm run dev`, etc.)

7. **Making changes**: 
   - Edit files in the library
   - The `npm run dev` watcher will automatically rebuild
   - **Restart your test project's dev server** to pick up the changes (some bundlers like Vite/Webpack may hot-reload, but TypeScript changes often require a restart)

**To unlink when done (npm):**
```bash
# In your test project
npm unlink @flowdit/chatbot-library

# In the library directory
npm unlink
```

##### Using yarn link:

1. **First, build the library once** (to create the `dist` folder):
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **In the library directory** (this project), create a global symlink:
   ```bash
   yarn link
   ```
   This creates a global symlink to your library package.

3. **In your test/example project** (the project where you want to use the library):
   ```bash
   yarn link @flowdit/chatbot-library
   ```
   This links your test project to the global symlink.

4. **Start development mode** in the library (keep this running):
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   This will watch for changes and automatically rebuild TypeScript and SCSS files.

5. **In your test project**, import and use the library (same as npm example above)

6. **Start your test project's dev server** (e.g., `yarn start`, `yarn dev`, etc.)

7. **Making changes**: 
   - Edit files in the library
   - The `npm run dev` watcher will automatically rebuild
   - **Restart your test project's dev server** to pick up the changes

**To unlink when done (yarn):**
```bash
# In your test project
yarn unlink @flowdit/chatbot-library

# In the library directory
yarn unlink
```

**Note**: If your test project uses yarn but the library uses npm (or vice versa), you can mix them. For example, you can use `npm link` in the library and `yarn link` in the test project, or vice versa. Both package managers use the same global link directory.

#### Option B: Using file path in package.json (Alternative)

This approach uses a direct file path instead of symlinks:

1. **In your test project's `package.json`**, add:
   ```json
   {
     "dependencies": {
       "@flowdit/chatbot-library": "file:../path/to/Chatbot-library"
     }
   }
   ```
   Replace `../path/to/Chatbot-library` with the relative path from your test project to the library.

2. **Install dependencies** in your test project:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development mode** in the library:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Use the library** in your test project as shown in Option A.

**Note**: With this approach, you may need to reinstall (`npm install` or `yarn install`) in your test project when you make significant changes to the library's package.json.

### 4. Build for Production

When you're ready to build the final version:

```bash
npm run build
```

This creates optimized production builds in the `dist/` folder.

### 5. Clean Build Artifacts

To remove the `dist/` folder:

```bash
npm run clean
```

## Development Workflow

1. Start development mode: `npm run dev`
2. Make changes to your TypeScript/SCSS files
3. Files automatically rebuild
4. Test in your linked project
5. When ready, build: `npm run build`
6. Publish: `npm publish`

## Quick Reference: Testing in Real Project

**TL;DR - Fastest way to test with npm:**

```bash
# Terminal 1: In library directory
cd /path/to/Chatbot-library
npm run build    # Build once first
npm link          # Create global symlink
npm run dev       # Start watching for changes

# Terminal 2: In your test project
cd /path/to/your-test-project
npm link @flowdit/chatbot-library  # Link to library
npm start  # Start your dev server
```

**Or with yarn:**

```bash
# Terminal 1: In library directory
cd /path/to/Chatbot-library
yarn build       # Build once first
yarn link         # Create global symlink
yarn dev          # Start watching for changes

# Terminal 2: In your test project
cd /path/to/your-test-project
yarn link @flowdit/chatbot-library  # Link to library
yarn start  # Start your dev server
```

Then import in your test project:
```tsx
import { FullScreenChat, ChatbotProvider } from '@flowdit/chatbot-library'
import '@flowdit/chatbot-library/dist/styles.css'
```

## Troubleshooting

### Changes not reflecting in test project

- Make sure `npm run dev` is running in the library
- **Restart your test project's dev server** (most bundlers need a restart for TypeScript changes)
- Clear node_modules and reinstall: `npm run clean && npm install`
- Verify the link is active: `ls -la node_modules/@flowdit` (should show a symlink)

### React duplicate dependency errors (with npm link)

If you see errors about duplicate React instances:

**Solution 1: Use --preserve-symlinks** (Recommended)
```bash
# In your test project, modify your start script in package.json:
"scripts": {
  "start": "react-scripts start --preserve-symlinks"
}
```

**Solution 2: Add resolve alias** (for Webpack-based projects)
In your test project's webpack config or `package.json`:
```json
{
  "resolutions": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**Solution 3: Use file path instead** (Option B above) - avoids React duplication issues

### TypeScript errors

- Make sure all dependencies are installed: `npm install`
- Check that TypeScript version is compatible
- Make sure the library is built: `npm run build` before linking
- Check that `dist/index.d.ts` exists (type definitions)

### SCSS not compiling

- Make sure `sass` is installed: `npm install`
- Check that the SCSS file path is correct
- Verify `dist/styles.css` is being generated

### Module not found errors

- Ensure you've run `npm run build` at least once in the library
- Check that `dist/` folder exists with compiled files
- Verify the link: `npm ls @flowdit/chatbot-library` in your test project
- Try unlinking and relinking: `npm unlink @flowdit/chatbot-library && npm link @flowdit/chatbot-library`

