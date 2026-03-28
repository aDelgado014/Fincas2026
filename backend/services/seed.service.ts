import { db } from '../db/index.ts';
import { communities, units, owners, unitOwners, tenants, charges, payments } from '../db/schema.ts';
import { v4 as uuidv4 } from 'uuid';

export class SeedService {
  static async runSeed() {
    console.log('Starting massive seed (25 communities)...');

    // Limpiar tablas para evitar duplicados y conflictos
    console.log('Cleaning existing data...');
    await db.delete(payments);
    await db.delete(charges);
    await db.delete(unitOwners);
    await db.delete(units);
    await db.delete(owners);
    await db.delete(tenants);
    await db.delete(communities);
    console.log('Database cleaned.');

    const communityPrefixes = ['Residencial', 'Edificio', 'Urbanización', 'Palacio', 'Jardines', 'Torre', 'Villa', 'Altos', 'Mirador', 'Senderos', 'Parque', 'Finca', 'Hacienda', 'Puerta', 'Costa'];
    const communitySuffixes = ['Los Pinos', 'Aurora', 'El Soto', 'Cristal', 'del Rey', 'Blanca', 'del Sol', 'del Mar', 'de la Sierra', 'Victoria', 'de la Luz', 'Verde', 'Azul', 'Dorada', 'de la Luna'];

    const ownerNames = [
      'Juan Pérez', 'María García', 'Antonio López', 'Carmen Martínez', 
      'Francisco Sánchez', 'Isabel Rodríguez', 'Manuel Pérez', 'Jesús García',
      'Pedro Fernández', 'Ángel Martínez', 'José Luis Díaz', 'David Ruiz',
      'Laura Blanco', 'Javier Cano', 'Elena Ortega', 'Sergio Soler',
      'Paula Marín', 'Diego Ibáñez', 'Claudia Diez', 'Rubén Vega'
    ];

    const tenantNames = [
      'Lucas Blanco', 'Sofía Cano', 'Hugo Ortega', 'Valentina Soler',
      'Leo Marín', 'Emma Ibáñez', 'Mateo Diez', 'Martina Vega',
      'Nico Santos', 'Lucía Ferrer', 'Alex Vidal', 'Sara Moya'
    ];

    const totalCommunities = 25;

    for (let c = 0; c < totalCommunities; c++) {
      const prefix = communityPrefixes[c % communityPrefixes.length];
      const suffix = communitySuffixes[Math.floor(Math.random() * communitySuffixes.length)];
      const name = `${prefix} ${suffix}${c >= communityPrefixes.length ? ' ' + (Math.floor(c / communityPrefixes.length) + 1) : ''}`;

      const communityId = uuidv4();
      await db.insert(communities).values({
        id: communityId,
        code: `COM-${uuidv4().slice(0, 4).toUpperCase()}${c}`,
        name: name,
        nif: `B${Math.floor(Math.random() * 90000000 + 10000000)}`,
        address: `Calle ${suffix}, ${Math.floor(Math.random() * 100 + 1)}`,
        bankAccountRef: `ES${Math.floor(Math.random() * 1e20)}`,
      });

      // Generar entre 4 y 8 unidades por comunidad
      const numUnits = Math.floor(Math.random() * 5) + 4;
      for (let i = 1; i <= numUnits; i++) {
        const unitId = uuidv4();
        const ownerId = uuidv4();
        const tenantId = uuidv4();

        // 1. Crear Propietario
        await db.insert(owners).values({
          id: ownerId,
          fullName: ownerNames[Math.floor(Math.random() * ownerNames.length)],
          email: `owner${ownerId.slice(0,4)}@example.com`,
          phone: `6${Math.floor(Math.random() * 90000000 + 10000000)}`,
          taxId: `${Math.floor(Math.random() * 90000000)}Z`,
        });

        // 2. Crear Inquilino
        await db.insert(tenants).values({
          id: tenantId,
          fullName: tenantNames[Math.floor(Math.random() * tenantNames.length)],
          email: `tenant${tenantId.slice(0,4)}@example.com`,
          phone: `7${Math.floor(Math.random() * 90000000 + 10000000)}`,
          taxId: `${Math.floor(Math.random() * 90000000)}X`,
        });

        // 3. Crear Unidad
        await db.insert(units).values({
          id: unitId,
          communityId: communityId,
          unitCode: `${Math.floor(i / 3) + 1}${['A', 'B', 'C'][i % 3]}`,
          floor: `${Math.floor(i / 3) + 1}`,
          door: ['A', 'B', 'C'][i % 3],
          coefficient: 100 / numUnits,
          tenantId: tenantId,
        });

        // 4. Vincular Propietario
        await db.insert(unitOwners).values({
          id: uuidv4(),
          unitId: unitId,
          ownerId: ownerId,
          ownershipPercentage: 100,
        });

        // 5. Cargos y Pagos
        for (let m = 1; m <= 3; m++) {
          const chargeId = uuidv4();
          const amount = 50 + Math.random() * 20;
          const isPaid = Math.random() > 0.3;

          await db.insert(charges).values({
            id: chargeId,
            communityId: communityId,
            unitId: unitId,
            ownerId: ownerId,
            concept: `Cuota Mes ${m}`,
            amount: amount,
            dueDate: `2024-0${m}-05`,
            status: isPaid ? 'paid' : 'pending',
          });

          if (isPaid) {
            await db.insert(payments).values({
              id: uuidv4(),
              chargeId: chargeId,
              amount: amount,
              paymentDate: `2024-0${m}-0${Math.floor(Math.random() * 4 + 1)}`,
              source: 'bank_transfer',
            });
          }
        }
      }
    }

    console.log('Massive seed (25) completed successfully.');
    return { 
      success: true, 
      message: `Se han generado ${totalCommunities} comunidades con sus unidades, propietarios e inquilinos.`,
      communitiesCreated: totalCommunities 
    };
  }
}
