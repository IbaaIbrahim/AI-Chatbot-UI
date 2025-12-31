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

The project is structured as a monorepo, which makes local testing seamless.

#### Option A: Using the built-in Demo App (Recommended for UI work)

The `apps/demo` project is pre-configured to work with the library.

1.  **Immediate Updates (HMR)**:
    The demo is configured to alias `flowdit-chatbot-library` directly to its source files. Changes you make in the `packages/chatbot-library` folder will reflect **instantly** in the demo without a build step.
    
    ```bash
    # Run from the root
    npm run dev:demo
    ```

2.  **Using Built Package (Production-like)**:
    If you want to test how the library behaves when compiled (e.g., checking `dist` output), you'll need to run the library's watcher:
    
    ```bash
    # Terminal 1: Watch the library (rebuilds dist on change)
    npm run watch -w flowdit-chatbot-library
    
    # Terminal 2: Run the demo
    npm run dev:demo
    ```
    *Note: You may need to update `apps/demo/vite.config.ts` to point to `../../packages/chatbot-library` (root) instead of `index.ts` if you want to strictly use the `dist` folder.*

#### Option B: Testing in External Projects (npm/yarn link)

To test the library in a completely separate project:

1.  **Build the library**:
    ```bash
    npm run build -w flowdit-chatbot-library
    ```

2.  **Link the library**:
    ```bash
    # In packages/chatbot-library
    npm link
    
    # In your external project
    npm link flowdit-chatbot-library
    ```

3.  **Import in your project**:
    ```tsx
    import { FullScreenChat, ChatbotProvider } from 'flowdit-chatbot-library'
    import 'flowdit-chatbot-library/dist/styles.css'
    ```

---

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

