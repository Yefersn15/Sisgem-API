const express = require('express');
const router = express.Router();

// Rutas públicas (sin autenticación)
router.get('/', async (req, res) => {
  try {
    // Retornar array vacío por defecto si no hay banners
    // Esto se puede extender con un modelo real de banners
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  res.status(401).json({ message: 'No autorizado' });
});

router.put('/:id', async (req, res) => {
  res.status(401).json({ message: 'No autorizado' });
});

router.delete('/:id', async (req, res) => {
  res.status(401).json({ message: 'No autorizado' });
});

module.exports = router;
