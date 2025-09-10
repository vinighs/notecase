import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list'; // 1. IMPORTAR O NÓ
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ImageNode } from './editor/nodes/ImageNode.jsx';
import { TRANSFORMERS as COMMON_TRANSFORMERS, CHECK_LIST } from '@lexical/markdown';
import { IMAGE_TRANSFORMER } from '../services/ImageTransformer.js'; // Nome atualizado
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { registerCheckList } from '@lexical/list';
import { $getRoot } from 'lexical';

// --- NOSSAS FUNÇÕES DE CONVERSÃO ---
import { convertLexicalToMarkdown, convertMarkdownToLexical } from '../services/textProcessor';
import EditorToolbar from './EditorToolbar';
import { debounce, createNotePreview } from '../services/uiHelper';
import { Button } from 'react-bootstrap';
import Modal from './Modal';
// --- PLUGINS E ESTILOS PARA BLOCO DE CÓDIGO ---
import CodeHighlightPlugin from './editor/plugins/CodeHighlightPlugin';
import ImagePlugin from './editor/plugins/ImagePlugin.jsx';
// Importa um tema para o Prism.js. Você pode escolher outros temas.
import 'prismjs/themes/prism-tomorrow.css';

const EDITOR_THEME = {
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  list: {
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
    // A propriedade 'checklist' é a chave para a renderização correta.
    checklist: 'editor-list-checklist',
    listitemChecked: 'editor-listitem-checked',
    listitemUnchecked: 'editor-listitem-unchecked',
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
    highlight: 'editor-text-highlight',
  },
  image: 'editor-image',
};
const EDITOR_NODES = [ HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, CodeHighlightNode, LinkNode, AutoLinkNode, ImageNode ];
// CORREÇÃO: O transformer de checklist precisa vir ANTES dos transformers de lista comuns
// para que a sintaxe `* [ ]` seja capturada corretamente antes de ser tratada como um item de lista normal.
const ALL_TRANSFORMERS = [IMAGE_TRANSFORMER, CHECK_LIST, ...COMMON_TRANSFORMERS];

const formatCreationDate = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'long' }).toLowerCase()} ${date.getFullYear()} at ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const EditorContent = ({ note, onSave, onDelete, onRecover, onCreateNote, onBackToNoteList, isTrashView, disabled, isCompact }) => {
  const [editor] = useLexicalComposerContext();
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', body: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const editorStateRef = useRef();
  const debouncedSaveRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Adiciona uma API global para o App.jsx acessar o conteúdo atual
    window.editorAPI = {
      getCurrentContent: () => {
        return new Promise((resolve) => {
          editor.getEditorState().read(() => {
            const editorStateJSON = editor.getEditorState().toJSON();
            // Verifica se o root está vazio
            if (
              !editorStateJSON.root ||
              !editorStateJSON.root.children ||
              editorStateJSON.root.children.length === 0
            ) {
              resolve('');
              return;
            }
            const markdown = convertLexicalToMarkdown(JSON.stringify(editorStateJSON));
            resolve(markdown);
          });
        });
      }
    };
    return () => {
      delete window.editorAPI;
    };
  }, [editor]);

  useEffect(() => {
    // Foca o editor sempre que uma nova nota é selecionada e está editável.
    // A `key` no LexicalComposer garante que um novo editor seja montado,
    // acionando este efeito.
    if (editor && !disabled && !isTrashView) {
      // Usamos um timeout para garantir que o foco ocorra após a renderização completa do DOM.
      const timer = setTimeout(() => {
        editor.focus(() => {
          // Após focar, movemos a seleção para o final do documento.
          // Isso é útil tanto para notas novas (cursor no início) quanto
          // para notas existentes (cursor no final para continuar a digitação).
          editor.update(() => {
            const root = $getRoot();
            root.selectEnd();
          });
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [editor, disabled, isTrashView]);

  useEffect(() => {
    return registerCheckList(editor);
  }, [editor]);

  // Efeito para abrir links externamente
// Efeito para abrir links externamente
useEffect(() => {
  const handleClick = (event) => {
    // Verifica se o clique foi em um link ou em um elemento filho de um link
    let target = event.target;
    
    // Sobe na árvore DOM para encontrar um link, se houver
    while (target && target !== document.body) {
      if (target.tagName === 'A' || target.hasAttribute('href')) {
        break;
      }
      // Verifica também se é um elemento com data-lexical-link
      if (target.dataset && target.dataset.lexicalLink) {
        break;
      }
      target = target.parentElement;
    }
    
    // Se encontrou um link e ele está dentro do editor
    if (target && (target.tagName === 'A' || target.hasAttribute('href'))) {
      const isInsideEditor = target.closest('.editor-input') || target.closest('.lexical-editor-container');
      
      if (isInsideEditor) {
        event.preventDefault(); // Previne a navegação dentro do Electron
        event.stopPropagation(); // Para a propagação do evento
        
        const url = target.getAttribute('href') || target.dataset.href;
        
        if (url) {
          // Validação básica de URL
          if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
            console.log('Opening external link:', url);
            window.electronAPI.openExternalLink(url);
          } else if (!url.startsWith('#') && !url.startsWith('javascript:')) {
            // Se não tem protocolo, assume https://
            console.log('Opening external link with https:', `https://${url}`);
            window.electronAPI.openExternalLink(`https://${url}`);
          }
        }
      }
    }
  };

  // Adiciona listener no document para capturar todos os clicks
  document.addEventListener('click', handleClick, true); // true para capturar na fase de capture
  
  // Adiciona também listener para tecla Enter em links (acessibilidade)
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      const target = event.target;
      if ((target.tagName === 'A' || target.hasAttribute('href')) && 
          (target.closest('.editor-input') || target.closest('.lexical-editor-container'))) {
        event.preventDefault();
        const url = target.getAttribute('href');
        if (url) {
          window.electronAPI.openExternalLink(url.startsWith('http') ? url : `https://${url}`);
        }
      }
    }
  };
  
  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}, []);

  const debouncedSave = useMemo(() => {
    const debouncedFn = debounce((currentNoteId, markdownContent) => {
      if (onSave) {
        try {
          onSave(currentNoteId, markdownContent);
        } catch (err) {
          console.error('Error saving note:', err);
          setError('Failed to save note.');
        }
      }
    }, 1000);
    debouncedSaveRef.current = debouncedFn;
    return debouncedFn;
  }, [onSave]);

  useEffect(() => {
    return () => {
      debouncedSaveRef.current?.cancel?.(); // CORREÇÃO: Acessar o método cancel corretamente
      if (editorStateRef.current && note?.id && onSave) {
        const markdown = convertLexicalToMarkdown(JSON.stringify(editorStateRef.current)); // CORREÇÃO: Garantir que uma string seja passada
        if (markdown !== note.content) {
            onSave(note.id, markdown);
        }
      }
    };
  }, [note?.id, onSave, note?.content, debouncedSaveRef]);

  const handleEditorChange = useCallback((editorState, editor) => {
  if (disabled || isTrashView || !note?.id) return;
  
  const editorStateJSON = editorState.toJSON();
  editorStateRef.current = editorStateJSON;

  const markdown = convertLexicalToMarkdown(JSON.stringify(editorStateJSON));

  // Debug melhorado
  if (JSON.stringify(editorStateJSON).includes('"type":"image"')) {
    console.log('[Editor.jsx] Estado do editor contém imagem:', {
      hasImageNode: true,
      markdownGenerated: markdown.includes('!['),
      markdownContent: markdown,
      editorStateSnapshot: JSON.stringify(editorStateJSON, null, 2)
    });
  }

  debouncedSave(note.id, markdown);
}, [disabled, isTrashView, note?.id, debouncedSave]);

  const handleRecover = useCallback(() => onRecover?.(note.id), [onRecover, note?.id]);
  const handleDelete = useCallback(() => onDelete?.(note.id), [onDelete, note?.id]);
  const handleCreateNote = useCallback(() => onCreateNote?.(), [onCreateNote]);
  const handleBackToNoteList = useCallback(() => onBackToNoteList?.(), [onBackToNoteList]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      setModalContent({ title: 'Not Supported', body: 'Share functionality is not supported.' });
      setShowModal(true);
      return;
    }
    const textToShare = note.content;
    if (!textToShare || textToShare.trim() === '') {
      setModalContent({ title: 'Empty Note', body: 'There is no content to share.' });
      setShowModal(true);
      return;
    }
    try {
      await navigator.share({ title: createNotePreview(note.content, 40) || 'Note', text: textToShare });
    } catch (error) {
      if (error.name !== 'AbortError') {
        setModalContent({ title: 'Share Error', body: 'An error occurred while sharing.' });
        setShowModal(true);
      }
    }
  }, [note?.content]);

  return (
    <div className="editor-wrapper d-flex flex-column h-100">
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="editor-controls mb-2 d-flex align-items-center justify-content-between w-100" style={{ minHeight: '60px', gap: '12px' }}>
        <div className="d-flex align-items-center" style={{ minWidth: 0, flex: 1 }}>
          {isMobile && note && (
            <Button variant="link" className="editor-back-btn me-3" onClick={handleBackToNoteList} title="Back to note list">
              <i className="bi bi-arrow-left" aria-hidden="true"></i>
            </Button>
          )}
          {note && !disabled && !isTrashView && (
            <div className="editor-toolbar-wrapper" style={{ minWidth: 0, flex: 1 }}>
              <EditorToolbar editor={editor} onShare={handleShare} onDelete={handleDelete} isCompact={isCompact} />
            </div>
          )}
        </div>
        <div className="editor-actions" style={{ flexShrink: 0 }}>
          {!note ? null : isTrashView ? (
            <>
              <Button size="sm" onClick={handleRecover} className="btn-recover me-2"><i className="bi bi-arrow-counterclockwise"></i><span className="ms-1 d-none d-md-inline">Recover</span></Button>
              <Button size="sm" onClick={handleDelete} className="btn-delete-permanent"><i className="bi bi-trash3-fill"></i><span className="ms-1 d-none d-md-inline">Delete</span></Button>
            </>
          ) : (
            <Button variant="icon" className="new-note-button-fixed" onClick={handleCreateNote} title="Create new note">
              <i className="bi bi-pencil-square"></i>
            </Button>
          )}
        </div>
      </div>

      {note && note.createdAt && !isTrashView && (
        <div className="note-creation-date small mb-2 text-center">
          {formatCreationDate(note.createdAt)}
        </div>
      )}

      <div className="lexical-editor-container position-relative flex-grow-1" style={{ minHeight: 0 }}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input h-100" />}
          placeholder={<div className="editor-placeholder">Write something...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleEditorChange} ignoreSelectionChange={true} />
        <ListPlugin />
        <LinkPlugin />
        <CodeHighlightPlugin />
        <ImagePlugin />
        <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalContent.title}>
        <p>{modalContent.body}</p>
      </Modal>
    </div>
  );
};

const Editor = ({ note, onSave, onDelete, onRecover, onCreateNote, onBackToNoteList, isTrashView = false, disabled = false }) => {
  const [isCompact, setIsCompact] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initialConfig = useMemo(() => {
    if (!note) return null;

    // --- CORREÇÃO: Converte Markdown para o estado Lexical na inicialização ---
    const initialEditorState = note.content
      ? convertMarkdownToLexical(note.content)
      : null;

    return {
      namespace: `AnotaEditor-${note.id}`,
      theme: EDITOR_THEME,
      nodes: EDITOR_NODES,
      editorState: initialEditorState, // Passa o estado JSON convertido
      editable: !disabled && !isTrashView,
      onError: (error) => console.error("Lexical Error:", error),
    };
  }, [note?.id, note?.content, disabled, isTrashView]);

  if (!note) {
    // ... (código para quando não há nota selecionada)
    return (
        <div className="editor-wrapper d-flex flex-column h-100 position-relative justify-content-center align-items-center">
          <div className="d-flex flex-column align-items-center text-muted">
            <Button className="new-note-button-no-note mt-3" onClick={onCreateNote} title="Create new note" aria-label="Create new note">
              <i className="bi bi-pencil-square" aria-hidden="true"></i>
            </Button>
            <p>Select a note or create a new one.</p>
          </div>
        </div>
      );
  }

  if (!initialConfig) {
    return <div className="d-flex justify-content-center align-items-center h-100 text-danger"><p>Unable to initialize editor.</p></div>;
  }

  return (
    <LexicalComposer initialConfig={initialConfig} key={note.id}>
      <EditorContent
        note={note}
        onSave={onSave}
        onDelete={onDelete}
        onRecover={onRecover}
        onCreateNote={onCreateNote}
        onBackToNoteList={onBackToNoteList}
        isTrashView={isTrashView}
        disabled={disabled}
        isCompact={isCompact}
      />
    </LexicalComposer>
  );
};

export default Editor;