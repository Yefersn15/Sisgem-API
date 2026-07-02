require('dotenv').config();
const path = require('path');
const sequelize = require(path.join(__dirname, '..', 'config', 'database'));

(async () => {
  try {
    await sequelize.authenticate();
    console.log('🟢 Database connection established');

    // 1. Find duplicates: pedido_id with more than one domicilio
    const [duplicates] = await sequelize.query(`
      SELECT pedido_id, COUNT(*) as count
      FROM domicilios
      GROUP BY pedido_id
      HAVING COUNT(*) > 1
    `, { type: sequelize.QueryTypes.SELECT });

    const dupArray = Array.isArray(duplicates) ? duplicates : [];
    if (dupArray.length === 0) {
      console.log('✅ No duplicate domicilio found for any pedido');
    } else {
      console.log(`⚠️ Found ${dupArray.length} pedido(s) with duplicate domicilio. Cleaning up...`);
      for (const row of dupArray) {
        const pedidoId = row.pedido_id;
        const [domicilios] = await sequelize.query(
          `SELECT id FROM domicilios WHERE pedido_id = $1 ORDER BY id DESC`,
          { replacements: [pedidoId], type: sequelize.QueryTypes.SELECT }
        );
        const domArray = Array.isArray(domicilios) ? domicilios : [];
        if (domArray.length > 1) {
          const idsToDelete = domArray.slice(1).map(d => d.id);
          await sequelize.query(
            `DELETE FROM domicilios WHERE id = ANY($1::int[])`,
            { replacements: [idsToDelete] }
          );
          console.log(`   🗑️ Deleted ${idsToDelete.length} duplicate(s) for pedido ${pedidoId}`);
        }
      }
    }

    // 2. Create unique index on pedido_id
    try {
      await sequelize.query(`CREATE UNIQUE INDEX idx_domicilios_pedido_unique ON domicilios(pedido_id)`);
      console.log('✅ Unique index idx_domicilios_pedido_unique created on domicilios table');
    } catch (indexErr) {
      // If index already exists, ignore
      if (indexErr.original && indexErr.original.code === '42P07') {
        console.log('ℹ️ Index idx_domicilios_pedido_unique already exists, skipping');
      } else {
        throw indexErr;
      }
    }

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
})();
