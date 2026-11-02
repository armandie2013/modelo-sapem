import { Router } from 'express';
import { fileURLToPath } from 'node:url';

const router = Router();

const archivoLucide = fileURLToPath(
  new URL(
    '../node_modules/lucide/dist/umd/lucide.js',
    import.meta.url
  )
);

router.get('/lucide.js', (req, res, next) => {
  res.sendFile(archivoLucide, error => {
    if (error) next(error);
  });
});

export default router;
