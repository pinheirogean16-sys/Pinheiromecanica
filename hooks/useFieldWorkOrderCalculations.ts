import { useMemo } from 'react';

interface useFieldWorkOrderCalculationsParams {
  kmIda: number | string;
  kmVolta: number | string;
  valorKm: number | string;
  servicos: Array<{ valor_total: any }>;
  pecas: Array<{ valor_total: any }>;
  maoObraExternaHoras: number | string;
  maoObraExternaValor: number | string;
  desconto: number | string;
  despesaPedagio: number | string;
  despesaCombustivel: number | string;
  despesaHospedagem: number | string;
  despesaAlimentacao: number | string;
  despesaDiariaTecnica: number | string;
  despesaGuincho: number | string;
  despesaOutros: number | string;
}

export function useFieldWorkOrderCalculations({
  kmIda,
  kmVolta,
  valorKm,
  servicos,
  pecas,
  maoObraExternaHoras,
  maoObraExternaValor,
  desconto,
  despesaPedagio,
  despesaCombustivel,
  despesaHospedagem,
  despesaAlimentacao,
  despesaDiariaTecnica,
  despesaGuincho,
  despesaOutros,
}: useFieldWorkOrderCalculationsParams) {

  const totalServicos = useMemo(() => {
    if (!Array.isArray(servicos)) return 0;
    return servicos.reduce((acc, s) => {
      const val = parseFloat(s?.valor_total as any);
      return acc + (isNaN(val) || val < 0 ? 0 : val);
    }, 0);
  }, [servicos]);

  const totalPecas = useMemo(() => {
    if (!Array.isArray(pecas)) return 0;
    return pecas.reduce((acc, p) => {
      const val = parseFloat(p?.valor_total as any);
      return acc + (isNaN(val) || val < 0 ? 0 : val);
    }, 0);
  }, [pecas]);

  const parsedKmIda = useMemo(() => {
    if (kmIda === undefined || kmIda === null || kmIda === '') return 0;
    const val = Number(String(kmIda).replace(',', '.'));
    return isNaN(val) || val < 0 ? 0 : val;
  }, [kmIda]);

  const parsedKmVolta = useMemo(() => {
    if (kmVolta === undefined || kmVolta === null || kmVolta === '') return 0;
    const val = Number(String(kmVolta).replace(',', '.'));
    return isNaN(val) || val < 0 ? 0 : val;
  }, [kmVolta]);

  const kmTotal = useMemo(() => {
    return parsedKmIda + parsedKmVolta;
  }, [parsedKmIda, parsedKmVolta]);

  const parsedValorKm = useMemo(() => {
    if (valorKm === undefined || valorKm === null || valorKm === '') return 0;
    const val = Number(String(valorKm).replace(',', '.'));
    return isNaN(val) || val < 0 ? 0 : val;
  }, [valorKm]);

  const totalDeslocamento = useMemo(() => {
    return kmTotal * parsedValorKm;
  }, [kmTotal, parsedValorKm]);

  const parsedMaoObraHoras = useMemo(() => {
    const val = parseFloat(maoObraExternaHoras as any);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [maoObraExternaHoras]);

  const parsedMaoObraValor = useMemo(() => {
    const val = parseFloat(maoObraExternaValor as any);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [maoObraExternaValor]);

  const maoObraExternaTotal = useMemo(() => {
    return parsedMaoObraHoras * parsedMaoObraValor;
  }, [parsedMaoObraHoras, parsedMaoObraValor]);

  const totalDespesas = useMemo(() => {
    const valPedagio = parseFloat(despesaPedagio as any);
    const valCombustivel = parseFloat(despesaCombustivel as any);
    const valHospedagem = parseFloat(despesaHospedagem as any);
    const valAlimentacao = parseFloat(despesaAlimentacao as any);
    const valDiaria = parseFloat(despesaDiariaTecnica as any);
    const valGuincho = parseFloat(despesaGuincho as any);
    const valOutros = parseFloat(despesaOutros as any);

    return (
      (isNaN(valPedagio) || valPedagio < 0 ? 0 : valPedagio) +
      (isNaN(valCombustivel) || valCombustivel < 0 ? 0 : valCombustivel) +
      (isNaN(valHospedagem) || valHospedagem < 0 ? 0 : valHospedagem) +
      (isNaN(valAlimentacao) || valAlimentacao < 0 ? 0 : valAlimentacao) +
      (isNaN(valDiaria) || valDiaria < 0 ? 0 : valDiaria) +
      (isNaN(valGuincho) || valGuincho < 0 ? 0 : valGuincho) +
      (isNaN(valOutros) || valOutros < 0 ? 0 : valOutros)
    );
  }, [
    despesaPedagio,
    despesaCombustivel,
    despesaHospedagem,
    despesaAlimentacao,
    despesaDiariaTecnica,
    despesaGuincho,
    despesaOutros,
  ]);

  const parsedDesconto = useMemo(() => {
    const val = parseFloat(desconto as any);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [desconto]);

  const totalGeral = useMemo(() => {
    const totalSemDesconto = totalServicos + totalPecas + totalDeslocamento + totalDespesas + maoObraExternaTotal;
    return Math.max(0, totalSemDesconto - parsedDesconto);
  }, [totalServicos, totalPecas, totalDeslocamento, totalDespesas, maoObraExternaTotal, parsedDesconto]);

  return {
    totalServicos,
    totalPecas,
    kmTotal,
    totalDeslocamento,
    maoObraExternaTotal,
    totalDespesas,
    totalGeral,
    parsedKmIda,
    parsedKmVolta,
  };
}
