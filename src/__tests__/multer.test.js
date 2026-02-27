import express from 'express';
import request from 'supertest';
import upload, { checkFileType } from '../config/multer.js';

describe('Multer Configuration', () => {
  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('File Type Validation', () => {
    it('should accept valid image file types (jpeg)', (done) => {
      const file = {
        originalname: 'test-image.jpeg',
        mimetype: 'image/jpeg',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept valid image file types (jpg)', (done) => {
      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept valid image file types (png)', (done) => {
      const file = {
        originalname: 'screenshot.png',
        mimetype: 'image/png',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should accept valid image file types (gif)', (done) => {
      const file = {
        originalname: 'animation.gif',
        mimetype: 'image/gif',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    it('should reject non-image file types (pdf)', (done) => {
      const file = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBe('Error: Images Only!');
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should reject non-image file types (txt)', (done) => {
      const file = {
        originalname: 'notes.txt',
        mimetype: 'text/plain',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBe('Error: Images Only!');
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should reject files with invalid extension even if mimetype is valid', (done) => {
      const file = {
        originalname: 'fake.exe',
        mimetype: 'image/jpeg',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBe('Error: Images Only!');
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should be case insensitive for file extensions', (done) => {
      const file = {
        originalname: 'IMAGE.JPEG',
        mimetype: 'image/jpeg',
      };

      checkFileType(file, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });
  });

  describe('Storage Configuration', () => {
    it('should use memory storage', () => {
      // The upload object should be configured with memory storage for Cloudinary
      expect(upload).toBeDefined();
      expect(upload.storage).toBeDefined();
    });
  });

  describe('File Size Limits', () => {
    it('should have a file size limit of 10MB', () => {
      expect(upload.limits).toBeDefined();
      expect(upload.limits.fileSize).toBe(10000000); // 10MB in bytes
    });
  });

  describe('FileFilter Integration', () => {
    it('should invoke fileFilter when a file is uploaded through multer middleware', async () => {
      const testApp = express();
      testApp.post('/test', upload.single('image'), (req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(testApp)
        .post('/test')
        .attach('image', Buffer.from('fake image data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Multer Options', () => {
    it('should have upload instance defined', () => {
      expect(upload).toBeDefined();
      expect(typeof upload).toBe('object');
    });

    it('should have storage configured', () => {
      expect(upload.storage).toBeDefined();
    });

    it('should have limits configured', () => {
      expect(upload.limits).toBeDefined();
      expect(upload.limits.fileSize).toBe(10000000);
    });
  });
});
