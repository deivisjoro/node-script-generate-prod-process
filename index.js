import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import path from 'path';
import xlsx from 'xlsx';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const directorio = path.join(__dirname, 'fichas');
const directorioSalida = path.join(__dirname, 'bulk_import');

function getCellValue(worksheet, rowIndex, colIndex) {
  const cellAddress = { r: rowIndex, c: colIndex };
  const cell = worksheet[xlsx.utils.encode_cell(cellAddress)];
  return cell ? cell.v : null;
}

async function leerDirectorio() {
  try {
    // Verificar si el directorio 'fichas' existe
    try {
      await fs.access(directorio);
    } catch (error) {
      throw new Error('El directorio "fichas" no existe.');
    }

    // Verificar y crear el directorio de salida si no existe
    try {
      await fs.access(directorioSalida);
    } catch (error) {
      await fs.mkdir(directorioSalida);
    }

    // Arreglo para almacenar los encabezados acumulados
    const encabezadosAcumulados = [];

    // Arreglo para almacenar todos los detalles acumulados
    const detallesAcumulados = [];

    const archivos = await fs.readdir(directorio);

    for (const archivo of archivos) {
      const rutaCompleta = path.join(directorio, archivo);

      try {
        const stats = await fs.stat(rutaCompleta);

        if (stats.isFile() && path.extname(archivo) === '.xlsx') {
          console.log('Archivo Excel encontrado:', archivo);

          // Leer el archivo Excel
          const workbook = xlsx.readFile(rutaCompleta);
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Obtener el encabezado principal
          const headerPrincipal = [];
          for (let rowIndex = 0; rowIndex <= 3; rowIndex++) {
            const cellA = getCellValue(worksheet, rowIndex, 0);
            const cellB = getCellValue(worksheet, rowIndex, 1);

            // Agregar tanto la etiqueta (columna A) como el valor (columna B) al encabezado principal
            headerPrincipal.push({
              label: cellA,
              value: cellB,
            });
          }

          // Agregar los encabezados al arreglo acumulado
          encabezadosAcumulados.push({
            importId: '',
            name: (headerPrincipal[0]?.value || '').trim(),
            code: (headerPrincipal[1]?.value || '').trim(),
            workshopStockLocation_name: (headerPrincipal[3]?.value || '').trim(),
            company_code: 'BASE',
            statusSelect: '3',
            product_code: (headerPrincipal[2]?.value || '').trim(),
          });

          // Obtener los detalles
          const ref = worksheet['!ref'];
          const range = xlsx.utils.decode_range(ref);
          const startRow = 6; // Empezar desde la fila 6 para los detalles

          for (let rowIndex = startRow; rowIndex <= range.e.r; rowIndex++) {
            const importId = '';
            const prodProcess_code = (headerPrincipal[1]?.value || '').trim();
            const name = (getCellValue(worksheet, rowIndex, 0) || '').trim();
            const priority = getCellValue(worksheet, rowIndex, 1);
            const workCenter_code = getCellValue(worksheet, rowIndex, 2);
            const description = (getCellValue(worksheet, rowIndex, 3) || '').trim();
            const minCapacityPerCycle = 0;
            const maxCapacityPerCycle = 0;
            const durationPerCycle_seconds = 0;

            // Verificar si al menos una celda de la fila contiene datos antes de agregarla
            if (name || priority || workCenter_code || description) {
              detallesAcumulados.push({
                importId,
                prodProcess_code,
                name,
                priority,
                workCenter_code,
                description,
                minCapacityPerCycle,
                maxCapacityPerCycle,
                durationPerCycle_seconds,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
      }
    }

    // Convertir a CSV y escribir el archivo acumulado de encabezados
    const nombreCSVEncabezadosAcumulados = 'production_prodProcess.csv';
    const rutaCSVEncabezadosAcumulados = path.join(directorioSalida, nombreCSVEncabezadosAcumulados);
    const csvDataEncabezadosAcumulados = Papa.unparse(encabezadosAcumulados, { delimiter: ';' });
    await fs.writeFile(rutaCSVEncabezadosAcumulados, csvDataEncabezadosAcumulados, 'utf-8');
    console.log('Archivo CSV de Encabezados acumulados creado:', nombreCSVEncabezadosAcumulados);

    // Convertir a CSV y escribir el archivo acumulado de detalles
    const nombreCSVDetallesAcumulados = 'production_prodProcessLine.csv';
    const rutaCSVDetallesAcumulados = path.join(directorioSalida, nombreCSVDetallesAcumulados);
    const csvDataDetallesAcumulados = Papa.unparse(detallesAcumulados, { delimiter: ';' });
    await fs.writeFile(rutaCSVDetallesAcumulados, csvDataDetallesAcumulados, 'utf-8');
    console.log('Archivo CSV de Detalles acumulados creado:', nombreCSVDetallesAcumulados);

  } catch (error) {
    console.error('Error al leer el directorio:', error.message);
  }
}

leerDirectorio();
