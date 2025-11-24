import ProductionForm from '@/components/ProductionForm';

export default function ProductionPage() {
  return (
    <div className="w-full space-y-6">
      <div className="mt-10 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Área de Producción</h1>
        <p className="text-sm text-gray-500 mt-1">Registra la producción diaria y el consumo de materia prima.</p>
      </div>

      <ProductionForm />
    </div>
  );
}