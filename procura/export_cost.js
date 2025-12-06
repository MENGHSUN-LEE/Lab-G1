// export_costs.js
const mysql = require('mysql2/promise');
const config = require('./config');

async function exportCosts() {
    try {
        const connection = await mysql.createConnection(config.db);
        console.log('✅ Connected to database\n');

        const [materials] = await connection.query(`
            SELECT 
                mu.id,
                mu.material_name,
                mu.vendor,
                mu.qty,
                mu.unit,
                mu.unit_price
            FROM materials_used mu
            ORDER BY mu.id
        `);

        if (materials.length === 0) {
            console.log('❌ No materials found');
            await connection.end();
            return;
        }

        console.log('📋 COPY THIS TABLE AND SEND IT TO ME:');
        console.log('='.repeat(120));
        console.log('ID | Material Name | Vendor | Quantity | Unit | Current Price | NEW PRICE (Fill this in!)');
        console.log('='.repeat(120));

        materials.forEach(m => {
            const id = String(m.id).padEnd(4);
            const name = (m.material_name || 'N/A').substring(0, 40).padEnd(42);
            const vendor = (m.vendor || 'N/A').substring(0, 15).padEnd(17);
            const qty = String(m.qty).padEnd(10);
            const unit = (m.unit || 'N/A').padEnd(6);
            const currentPrice = String(m.unit_price || '0.00').padEnd(15);
            
            console.log(`${id}| ${name}| ${vendor}| ${qty}| ${unit}| ${currentPrice}| ____________`);
        });

        console.log('='.repeat(120));
        console.log(`\nTotal materials: ${materials.length}`);
        console.log('\n💡 INSTRUCTIONS:');
        console.log('1. Copy the table above');
        console.log('2. Fill in the "NEW PRICE" column (right side)');
        console.log('3. Send it back to me');
        console.log('4. I will create an update script for you\n');

        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

exportCosts();