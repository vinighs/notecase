// ImageTransformer.js - Versão reescrita com práticas mais recentes
import { $isImageNode, $createImageNode, ImageNode } from '../components/editor/nodes/ImageNode';

export const IMAGE_TRANSFORMER = {
  dependencies: [ImageNode],
  export: (node, exportChildren, exportFormat) => {
    if (!$isImageNode(node)) {
      return null;
    }
    
    const src = node.getSrc();
    const altText = node.getAltText() || '';
    
    // Debug para verificar o que está sendo exportado
    console.log('[ImageTransformer.js] Exportando imagem:', { src, altText });
    
    // Garantir que sempre retornamos a sintaxe Markdown correta
    return `![${altText}](${src})`;
  },
  importRegExp: /!\[([^\]]*)\]\(([^)]+)\)/,
  regExp: /!\[([^\]]*)\]\(([^)]+)\)$/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    console.log('[ImageTransformer.js] Importando imagem:', { altText, src });
    const imageNode = $createImageNode({ src, altText });
    textNode.replace(imageNode);
  },
  trigger: ')',
  type: 'text-match',
};