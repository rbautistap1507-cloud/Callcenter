import ReporteMensual from "./ReporteMensual";
import ReporteProductosTop from "./ReporteProductosTop";
import ReporteCaducidades from "./ReporteCaducidades";
import ReporteCompradoVsVendido from "./ReporteCompradoVsVendido";
import ReporteTraspasos from "./ReporteTraspasos";
import ReporteCategorias from "./ReporteCategorias";
import ReporteVentas from "./ReporteVentas";
import ReporteBalanceGeneral from "./ReporteBalanceGeneral";

interface ReportesRouterProps {
  reporte: string | null;
  sucursalId: string;
  onVolver: () => void;
}

export default function ReportesRouter({ reporte, sucursalId, onVolver }: ReportesRouterProps) {
  const props = {
    sucursalId,
    todasLasSucursales: sucursalId === "todas",
    onVolver,
  };

  if (reporte === "productos-top") return <ReporteProductosTop {...props} />;
  if (reporte === "caducidades") return <ReporteCaducidades {...props} />;
  if (reporte === "comprado-vs-vendido") return <ReporteCompradoVsVendido {...props} />;
  if (reporte === "traspasos") return <ReporteTraspasos {...props} />;
  if (reporte === "categorias") return <ReporteCategorias {...props} />;
  if (reporte === "ventas") return <ReporteVentas {...props} />;
  if (reporte === "balance-general") return <ReporteBalanceGeneral {...props} />;

  return null;
}