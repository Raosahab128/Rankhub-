import {defineConfig} from 'vite';
import path from 'path';

export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          },
        },
        input: {
          main: path.resolve(__dirname, 'index.html'),
          exams: path.resolve(__dirname, 'exams.html'),
          examDetail: path.resolve(__dirname, 'exam-detail.html'),
          practice: path.resolve(__dirname, 'practice.html'),
          pyq: path.resolve(__dirname, 'pyq.html'),
          notes: path.resolve(__dirname, 'notes.html'),
          currentAffairs: path.resolve(__dirname, 'current-affairs.html'),
          liveTests: path.resolve(__dirname, 'live-tests.html'),
          testInterface: path.resolve(__dirname, 'test-interface.html'),
          testResult: path.resolve(__dirname, 'test-result.html'),
          about: path.resolve(__dirname, 'about.html'),
          privacy: path.resolve(__dirname, 'privacy.html'),
          terms: path.resolve(__dirname, 'terms.html'),
          contact: path.resolve(__dirname, 'contact.html'),
          profile: path.resolve(__dirname, 'profile.html'),
          performance: path.resolve(__dirname, 'performance.html'),
          rankhubPass: path.resolve(__dirname, 'rankhub-pass.html'),
          pyqDetail: path.resolve(__dirname, 'pyq-detail.html'),
          signin: path.resolve(__dirname, 'signin.html'),
          signup: path.resolve(__dirname, 'signup.html'),
          admin: path.resolve(__dirname, 'admin.html')
        },
      },
    },
  };
});
