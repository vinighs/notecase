// Crie este arquivo: src/components/editor/plugins/EnhancedLinkPlugin.jsx

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isLinkNode, LinkNode } from '@lexical/link';
import { $getSelection, $isRangeSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';

export default function EnhancedLinkPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Customiza a renderização de LinkNodes
    const removeLinkNodeTransform = editor.registerNodeTransform(
      LinkNode,
      (node) => {
        // Adiciona atributos de segurança aos links
        const element = editor.getElementByKey(node.getKey());
        if (element) {
          // Previne que o link seja seguido diretamente
          element.addEventListener('click', (e) => {
            e.preventDefault();
          }, { capture: true });
          
          // Adiciona atributos de segurança
          element.setAttribute('rel', 'noopener noreferrer');
          element.setAttribute('target', '_blank'); // Indica visualmente que é um link externo
          
          // Adiciona um data attribute para identificação
          element.setAttribute('data-lexical-link', 'true');
          
          // Adiciona tooltip com a URL
          const url = node.getURL();
          if (url) {
            // CORREÇÃO: Adiciona o atributo 'title' para a tooltip nativa do navegador
            element.setAttribute('title', url);
          }
        }
      }
    );

    // Adiciona listener para mudanças na seleção para atualizar links
    const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const nodes = selection.getNodes();
          nodes.forEach(node => {
            const parent = node.getParent();
            if ($isLinkNode(parent)) {
              const element = editor.getElementByKey(parent.getKey());
              if (element && !element.hasAttribute('data-lexical-link')) {
                element.setAttribute('data-lexical-link', 'true');
                element.setAttribute('rel', 'noopener noreferrer');
                element.setAttribute('target', '_blank');
              }
            }
          });
        }
      });
    });

    return mergeRegister(
      removeLinkNodeTransform,
      removeUpdateListener
    );
  }, [editor]);

  return null;
}

// Adicione este plugin no Editor.jsx, junto com os outros plugins:
// import EnhancedLinkPlugin from './editor/plugins/EnhancedLinkPlugin';
// 
// E dentro do componente EditorContent, após <LinkPlugin />:
// <EnhancedLinkPlugin />