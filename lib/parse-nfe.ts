import { XMLParser } from 'fast-xml-parser';

export interface NFeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface NFeSupplier {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  ie: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export interface NFeData {
  numero: string;
  serie: string;
  dataEmissao: string;
  chaveAcesso: string;
  fornecedor: NFeSupplier;
  itens: NFeItem[];
  totais: {
    valorProdutos: number;
    valorFrete: number;
    valorDesconto: number;
    valorNF: number;
  };
}

export function parseNFeXML(xmlString: string): NFeData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  
  const jsonObj = parser.parse(xmlString);
  
  // Helper to find a key recursively ignoring case and namespace prefixes
  const findNestedKey = (obj: any, targetKey: string): any => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[targetKey] !== undefined) return obj[targetKey];
    
    // Check key case-insensitively and without prefix
    const keys = Object.keys(obj);
    for (const key of keys) {
      const cleanKey = key.includes(':') ? key.split(':').pop() : key;
      if (cleanKey?.toLowerCase() === targetKey.toLowerCase()) {
        return obj[key];
      }
    }
    
    // Recursive check
    for (const key of keys) {
      if (typeof obj[key] === 'object') {
        const found = findNestedKey(obj[key], targetKey);
        if (found) return found;
      }
    }
    return null;
  };

  const nfe = findNestedKey(jsonObj, 'infNFe');
  const prot = findNestedKey(jsonObj, 'infProt') || findNestedKey(jsonObj, 'protNFe');

  if (!nfe) {
    throw new Error('Formato de XML de NF-e inválido ou não reconhecido. Certifique-se de que é um documento auxiliar de NF-e válido.');
  }

  const ide = findNestedKey(nfe, 'ide') || {};
  const emit = findNestedKey(nfe, 'emit');
  const total = findNestedKey(nfe, 'ICMSTot') || findNestedKey(nfe, 'total') || {};

  const det = findNestedKey(nfe, 'det');
  if (!det) {
    throw new Error('Nenhum item de produto cadastrado foi localizado na NF-e.');
  }
  const detArray = Array.isArray(det) ? det : [det];

  const itens: NFeItem[] = detArray.map((item: any, idx: number) => {
    console.log('[XML QUANTIDADE]', {
      descricao: item.prod?.xProd,
      qCom: item.prod?.qCom,
      qTrib: item.prod?.qTrib,
      vUnCom: item.prod?.vUnCom
    });
    
    // Resolve prod container recursively or directly
    const prod = findNestedKey(item, 'prod') || item.prod || {};
    
    // Use recursive key locator to resolve keys that might have namespace prefixes (e.g. "nfe:qCom")
    const rawCodigo = findNestedKey(prod, 'cProd') || prod.cProd;
    const rawDescricao = findNestedKey(prod, 'xProd') || prod.xProd;
    const rawNcm = findNestedKey(prod, 'NCM') || prod.NCM;
    const rawQuantidade = findNestedKey(prod, 'qCom') || prod.qCom;
    const rawValorUnitario = findNestedKey(prod, 'vUnCom') || prod.vUnCom;
    const rawValorTotal = findNestedKey(prod, 'vProd') || prod.vProd;

    const codigo = rawCodigo ? String(rawCodigo).trim() : `SEM_CODIGO_${idx + 1}`;
    const descricao = rawDescricao ? String(rawDescricao).trim() : 'PRODUTO SEM DESCRICAO';
    const ncm = rawNcm ? String(rawNcm).trim() : '00000000';

    // Parse values robustly under any standard-violating or empty formats
    const parsedQtd = Number(rawQuantidade);
    const quantidade = (!rawQuantidade || isNaN(parsedQtd) || parsedQtd <= 0) ? 1 : parsedQtd;

    const parsedVUn = Number(rawValorUnitario);
    const valorUnitario = (!rawValorUnitario || isNaN(parsedVUn)) ? 0 : parsedVUn;

    const parsedVProd = Number(rawValorTotal);
    const valorTotal = (!rawValorTotal || isNaN(parsedVProd)) ? (quantidade * valorUnitario) : parsedVProd;

    return {
      codigo,
      descricao: descricao.toUpperCase(),
      ncm,
      quantidade,
      valorUnitario,
      valorTotal,
    };
  });

  if (!emit) {
    throw new Error('Dados do emitente/fornecedor não foram configurados no XML.');
  }

  const enderEmit = findNestedKey(emit, 'enderEmit') || {};
  
  // Resolve cnpj, reasoning with namespace prefixes like nfe:CNPJ
  const rawCnpj = findNestedKey(emit, 'CNPJ') || findNestedKey(emit, 'CPF') || emit.CNPJ || emit.CPF;
  const cnpj = String(rawCnpj || '').trim();
  if (!cnpj) {
    throw new Error('CNPJ ou CPF do emitente não identificado no arquivo XML.');
  }

  const rawRazaoSocial = findNestedKey(emit, 'xNome') || emit.xNome;
  const rawNomeFantasia = findNestedKey(emit, 'xFant') || emit.xFant;
  const rawIe = findNestedKey(emit, 'IE') || emit.IE;

  const fornecedor: NFeSupplier = {
    cnpj,
    razaoSocial: rawRazaoSocial ? String(rawRazaoSocial).trim().toUpperCase() : 'FORNECEDOR INTEGRADO',
    nomeFantasia: rawNomeFantasia ? String(rawNomeFantasia).trim().toUpperCase() : undefined,
    ie: rawIe ? String(rawIe).trim() : 'ISENTO',
    endereco: findNestedKey(enderEmit, 'xLgr') ? `${String(findNestedKey(enderEmit, 'xLgr')).trim()}, ${String(findNestedKey(enderEmit, 'nro') || '').trim()}`.toUpperCase() : undefined,
    bairro: findNestedKey(enderEmit, 'xBairro') ? String(findNestedKey(enderEmit, 'xBairro')).trim().toUpperCase() : undefined,
    cidade: findNestedKey(enderEmit, 'xMun') ? String(findNestedKey(enderEmit, 'xMun')).trim().toUpperCase() : undefined,
    uf: findNestedKey(enderEmit, 'UF') ? String(findNestedKey(enderEmit, 'UF')).trim().toUpperCase() : undefined,
    cep: findNestedKey(enderEmit, 'CEP') ? String(findNestedKey(enderEmit, 'CEP')).trim().replace(/\D/g, '') : undefined,
  };

  const chaveAcesso = prot ? (findNestedKey(prot, 'chNFe') || '') : '';
  const rawNumero = findNestedKey(ide, 'nNF') || ide.nNF;
  const numero = rawNumero ? String(rawNumero) : '000000000';
  const rawSerie = findNestedKey(ide, 'serie') || ide.serie;
  const serie = rawSerie ? String(rawSerie) : '1';
  const dataEmissao = findNestedKey(ide, 'dhEmi') || findNestedKey(ide, 'dEmi') || ide.dhEmi || ide.dEmi || new Date().toISOString();

  const valorProdutos = Number(findNestedKey(total, 'vProd') || total.vProd || 0);
  const valorFrete = Number(findNestedKey(total, 'vFrete') || findNestedKey(total, 'vOutro') || total.vFrete || total.vOutro || 0);
  const valorDesconto = Number(findNestedKey(total, 'vDesc') || total.vDesc || 0);
  let valorNF = Number(findNestedKey(total, 'vNF') || total.vNF || 0);

  if (valorNF === 0) {
    valorNF = itens.reduce((sum, item) => sum + item.valorTotal, 0);
  }

  console.log('[FORNECEDOR XML]', fornecedor);
  console.log('[ITENS XML]', itens);

  return {
    numero,
    serie,
    dataEmissao,
    chaveAcesso,
    fornecedor,
    itens,
    totais: {
      valorProdutos,
      valorFrete,
      valorDesconto,
      valorNF,
    },
  };
}
