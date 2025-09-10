import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes, $getRoot, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import React, { useEffect, useState, useContext } from 'react';
import { $createImageNode, ImageNode } from '../nodes/ImageNode';
import ImageModal from '../../../components/ImageModal';
import useDataBridge from '../../../hooks/useDataBridge';
import AppContext from '../../../context/AppContext';

export const INSERT_IMAGE_COMMAND = createCommand('INSERT_IMAGE_COMMAND');

export default function ImagePlugin() {
  const [editor] = useLexicalComposerContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { saveImageFile } = useDataBridge();
  const { vaultPath } = useContext(AppContext) || {};

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagePlugin: ImageNode not registered on editor');
    }

    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      () => {
        setIsModalOpen(true);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  const handleInsertImage = async (payload, type) => {
    setIsModalOpen(false);
    
    if (type === 'url') {
      const { src, altText } = payload;
      console.log('[ImagePlugin.jsx] Inserindo imagem via URL:', { src, altText });
      
      editor.update(() => {
        const imageNode = $createImageNode({ src, altText });
        $insertNodes([imageNode]);
        console.log('[ImagePlugin.jsx] Nó de imagem criado e inserido via URL');
      });
      
      // Força salvamento imediato com delay para garantir que o estado foi atualizado
      setTimeout(() => {
        triggerImmediateSave();
      }, 100);
      
    } else if (type === 'upload') {
      const { file, altText } = payload;
      
      if (!vaultPath) {
        console.error('Vault path is not available to save the image.');
        return;
      }

      try {
        console.log('[ImagePlugin.jsx] Salvando arquivo de imagem:', { fileName: file.name, vaultPath });
        
        const relativePath = await saveImageFile(vaultPath, {
          buffer: await file.arrayBuffer(),
          name: file.name,
        });
        
        if (relativePath) {
          console.log('[ImagePlugin.jsx] Imagem salva com caminho relativo:', relativePath);

          editor.update(() => {
            const imageNode = $createImageNode({ src: relativePath, altText });
            $insertNodes([imageNode]);
            console.log('[ImagePlugin.jsx] Nó de imagem criado e inserido via upload');
          });
          
          // Força salvamento imediato com delay para garantir que o estado foi atualizado
          setTimeout(() => {
            triggerImmediateSave();
          }, 100);
        } else {
          console.error('[ImagePlugin.jsx] Erro: relativePath está vazio');
        }
      } catch (error) {
        console.error('[ImagePlugin.jsx] Erro ao salvar imagem:', error);
      }
    }
  };

  const triggerImmediateSave = () => {
    console.log('[ImagePlugin.jsx] Disparando salvamento imediato da nota');
    const event = new CustomEvent('force-save-note');
    window.dispatchEvent(event);
  };

  return (
    <ImageModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onInsert={handleInsertImage}
    />
  );
}