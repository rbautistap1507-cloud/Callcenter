import { readFileSync, writeFileSync } from 'fs'

let content = readFileSync('src/app/components/FarmaceuticoDashboard.tsx', 'utf8')

content = content.replace(
  `const tieneAntibioticos = cart.some((item) => {
      const categoria = String(item.producto.categoria || "").toLowerCase();
      const grupo = String(item.producto.grupo || "").toLowerCase();
      const agrupacion = String(item.producto.agrupacion || "").toLowerCase();
      const nombre = String(item.producto.nombre || "").toLowerCase();
      return categoria.includes("antibiotico") || categoria.includes("antibiótico") ||
             grupo.includes("antibiotico") || grupo.includes("antibiótico") ||
             agrupacion.includes("antibiotico") || agrupacion.includes("antibiótico") ||
             nombre.includes("antibiotico") || nombre.includes("antibiótico");
    });`,
  `const tieneAntibioticos = cart.some((item) => {
      const fields = [
        item.producto.categoria,
        item.producto.grupo,
        item.producto.agrupacion,
        item.producto.nombre,
        item.producto.sustanciaActiva,
      ].map(f => String(f || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      return fields.some(f => f.includes("antibiotico"));
    });`
)

// Mismo fix para isAntibiotico
content = content.replace(
  `return keywords.some(k => grupo.includes(k) || agrupacion.includes(k));`,
  `const fieldsCheck = [
      producto.categoria, producto.grupo, producto.agrupacion,
      producto.nombre, producto.sustanciaActiva
    ].map(f => String(f || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    return fieldsCheck.some(f => f.includes("antibiotico"));`
)

writeFileSync('src/app/components/FarmaceuticoDashboard.tsx', content, 'utf8')
console.log('Done')