import { db } from '../db/index.ts';
import { communities, units, owners, unitOwners, charges, incidents } from '../db/schema.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Script de Stress Test - Genera 2,000 comunidades con datos realistas y fallos.
 */
async function generateStressData() {
  console.log('🚀 Iniciando script de Stress Test (Proyectado: 2,000 comunidades)...');
  
  const BATCH_SIZE = 50;
  const TOTAL_COMMUNITIES = 2000;

  for (let i = 0; i < TOTAL_COMMUNITIES; i += BATCH_SIZE) {
    await db.transaction(async (tx) => {
      for (let j = 0; j < BATCH_SIZE; j++) {
        const communityId = uuidv4();
        const index = i + j;
        
        // 1. Crear Comunidad
        await tx.insert(communities).values({
          id: communityId,
          code: `STR-${index.toString().padStart(4, '0')}`,
          name: `Residencial Stress Test ${index}`,
          nif: `B${Math.floor(Math.random() * 90000000 + 10000000)}`,
          address: `Calle de la Prueba ${index}, Madrid`,
          status: 'active',
        });

        // 2. Crear Unidades y Propietarios (10-20 por comunidad)
        const unitCount = Math.floor(Math.random() * 10) + 10;
        for (let u = 0; u < unitCount; u++) {
          const unitId = uuidv4();
          const ownerId = uuidv4();

          await tx.insert(units).values({
            id: unitId,
            communityId,
            unitCode: `${Math.floor(u/4) + 1}${['A','B','C','D'][u%4]}`,
            coefficient: 100 / unitCount,
            monthlyFee: 50 + Math.random() * 100,
          });

          await tx.insert(owners).values({
            id: ownerId,
            fullName: `Propietario ${index}-${u}`,
            email: `owner${index}_${u}@example.com`,
            phone: `600${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          });

          await tx.insert(unitOwners).values({
            id: uuidv4(),
            unitId,
            ownerId,
            ownershipPercentage: 100,
          });

          // 3. Crear Deudas (Simulación de Fallos Reales)
          if (Math.random() > 0.7) { // 30% tiene deuda
            await tx.insert(charges).values({
              id: uuidv4(),
              communityId,
              unitId,
              ownerId,
              concept: 'Cuota ordinaria impagada (Simulación)',
              amount: 100 + Math.random() * 500,
              dueDate: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
              status: 'pending',
            });
          }
        }

        // 4. Crear Incidencias (2-5 por comunidad)
        if (Math.random() > 0.5) {
          for (let inc = 0; inc < 3; inc++) {
            await tx.insert(incidents).values({
              id: uuidv4(),
              communityId,
              title: `Incidencia de prueba ${index}-${inc}`,
              description: 'Reporte automático de fallo en zonas comunes.',
              status: Math.random() > 0.5 ? 'pending' : 'resolved',
              priority: Math.random() > 0.8 ? 'high' : 'medium',
            });
          }
        }
      }
    });
    console.log(`✅ Procesadas ${i + BATCH_SIZE} comunidades...`);
  }

  console.log('🎉 Stress Test Data Generation Complete!');
}

generateStressData().catch(console.error);
