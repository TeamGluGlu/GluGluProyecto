import ProductionForm from '@/components/ProductionForm';

export default function ProductionPage() {
  return (
    <div className="w-full min-h-screen space-y-6">
      <div className="mt-10">
        <h1 className="text-2xl font-bold text-gray-900">Área de Producción</h1>
        <p className="text-sm text-gray-500 mt-1">Registra la producción diaria y el consumo de materia prima.</p>
      </div>

      <ProductionForm />
    </div>
  );
}