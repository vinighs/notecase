import React, { useState, useEffect, useContext } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_LOW, CLICK_COMMAND, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, $getNodeByKey } from 'lexical';
import AppContext from '../../../context/AppContext';
import { $isImageNode } from './ImageNode';

const ImageComponent = ({ src, altText, width, height, nodeKey }) => {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const { vaultPath } = useContext(AppContext);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const resolvePath = async () => {
      setIsLoading(true);
      // --- DEBUG: Log para verificar o caminho da imagem recebido pelo componente ---
      console.log('[ImageComponent.jsx] Tentando resolver imagem:', { src, vaultPath });
      setHasError(false);
      
      try {
        if (src.startsWith('http://') || src.startsWith('https://')) {
          setResolvedSrc(src);
        } else if (vaultPath && src) { // Adicionada verificação para src não ser vazio
          console.log('[ImageComponent.jsx] Caminho é local. Chamando electronAPI.resolveImagePath...');
          const absolutePath = await window.electronAPI.resolveImagePath(vaultPath, src);
          console.log('[ImageComponent.jsx] Caminho absoluto resolvido:', absolutePath);
          setResolvedSrc(absolutePath);
        }
      } catch (error) {
        console.error('[ImageComponent.jsx] Erro ao resolver o caminho da imagem:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    resolvePath();
  }, [src, vaultPath]);

  const onDelete = (payload) => {
    if (isSelected && editor.isEditable()) {
      const event = payload;
      event.preventDefault();
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.remove();
        }
      });
    }
    return false;
  };

  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          const img = event.target;
          if (event.target.tagName === 'IMG' && img.getAttribute('data-node-key') === nodeKey) {
            if (event.shiftKey) {
              setSelected(!isSelected);
            } else {
              clearSelection();
              setSelected(true);
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
    );
  }, [editor, isSelected, nodeKey, clearSelection, setSelected]);

  if (isLoading) {
    return (
      <div className="editor-image-placeholder">
        <i className="bi bi-image"></i>
        <span>Loading image...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="editor-image-error">
        <i className="bi bi-exclamation-triangle-fill"></i>
        <span>Image not found: {src}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={altText}
      width={width}
      height={height}
      data-node-key={nodeKey}
      className={`editor-image ${isSelected ? 'selected' : ''}`}
      style={{ maxWidth: '100%', height: 'auto' }}
      onError={(e) => {
        console.error('[ImageComponent.jsx] Erro no carregamento do <img>. Caminho final:', resolvedSrc);
        setHasError(true);
      }}
      onLoad={(e) => {
        console.log('[ImageComponent.jsx] Imagem carregada com sucesso:', resolvedSrc);
      }}
    />
  );
};

export default ImageComponent;