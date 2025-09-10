import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND, 
  FORMAT_ELEMENT_COMMAND,
  $getSelection, 
  $isRangeSelection,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  createCommand,
  $createParagraphNode
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { 
  $isListItemNode, 
  $isListNode, 
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND
} from '@lexical/list';
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import { 
  $createHeadingNode,
  $isHeadingNode, 
  $createQuoteNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { Button as BootstrapButton, ButtonGroup, Form, OverlayTrigger, Popover } from 'react-bootstrap';
import Modal from './Modal';
import { useResponsiveToolbar } from '../hooks/useResponsiveToolbar';
import { INSERT_IMAGE_COMMAND } from './editor/plugins/ImagePlugin';
import CustomButton from './Button';

// Importa o novo arquivo CSS
import './EditorToolbar.css';

const LowPriority = 1;

const EditorToolbar = ({ editor, onShare, onDelete }) => {
  // REMOVIDO: const [editor] = useLexicalComposerContext();
  const [blockType, setBlockType] = useState('paragraph');
  const [isLink, setIsLink] = useState(false);
  const [textFormats, setTextFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    highlight: false,
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const formatMenuTarget = useRef(null);
  const moreMenuTarget = useRef(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditable, setIsEditable] = useState(true);
  const toolbarRef = useRef(null);

  // Função para obter o nó selecionado
  const getSelectedNode = useCallback((selection) => {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    
    if (anchorNode === focusNode) {
      return anchorNode;
    }
    
    const isBackward = selection.isBackward();
    return isBackward ? anchorNode : focusNode;
  }, []);

  // Função para detectar o tipo de bloco atual
  const detectBlockType = useCallback((selection) => {
    const anchorNode = selection.anchor.getNode();
    let element = anchorNode.getKey() === 'root' 
      ? anchorNode 
      : anchorNode.getTopLevelElementOrThrow();

    // Verificar se é um ListItemNode primeiro
    if ($isListItemNode(element)) {
      const parent = element.getParent();
      if ($isListNode(parent)) {
        const listType = parent.getListType();
        if (listType === 'bullet') return 'bullet';
        if (listType === 'number') return 'number';
        if (listType === 'check') return 'check';
      }
    }

    if ($isListNode(element)) {
      const listType = element.getListType();
      if (listType === 'bullet') return 'bullet';
      if (listType === 'number') return 'number';
      if (listType === 'check') return 'check';
    }

    if ($isHeadingNode(element)) {
      return element.getTag();
    }

    if ($isQuoteNode(element)) {
      return 'quote';
    }

    return 'paragraph';
  }, []);

  // Atualizar toolbar baseado na seleção atual
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    
    if ($isRangeSelection(selection)) {
      const newTextFormats = {
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'), 
        underline: selection.hasFormat('underline'),
        strikethrough: selection.hasFormat('strikethrough'),
        code: selection.hasFormat('code'),
        highlight: selection.hasFormat('highlight'),
      };
      setTextFormats(newTextFormats);

      const currentBlockType = detectBlockType(selection);
      setBlockType(currentBlockType);

      const node = getSelectedNode(selection);
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));
    }
  }, [detectBlockType, getSelectedNode]);

  // Registrar listeners
  useEffect(() => {
    if (!editor) return;

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        LowPriority,
      ),
    ); 
  }, [editor, updateToolbar]);

  // Efeito para controlar o modo de edição
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [isEditable, editor]);

  // Handlers para formatação de texto
  const handleTextFormat = useCallback((format) => {
    if (!editor) {
      setErrorMessage('Editor is not available. Please try again.');
      setShowErrorModal(true);
      return;
    }
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  }, [editor, setErrorMessage, setShowErrorModal]);

  // Handler para mudança de tipo de bloco
  const handleBlockTypeChange = useCallback((newBlockType) => {
    if (!editor) {
      setErrorMessage('Editor is not available. Please try again.');
      setShowErrorModal(true);
      return;
    }

    const formatBlock = (createNode) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, createNode);
        }
      });
    };

    const toggleList = (type, command) => {
      if (blockType === type) {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      } else {
        editor.dispatchCommand(command, undefined);
      }
    };
    
    switch (newBlockType) {
      case 'paragraph':
        formatBlock($createParagraphNode);
        break;
      case 'h1':
      case 'h2':
      case 'h3':
        formatBlock(() => $createHeadingNode(newBlockType));
        break;
      case 'quote':
        formatBlock($createQuoteNode);
        break;
      case 'bullet':
        toggleList('bullet', INSERT_UNORDERED_LIST_COMMAND);
        break;
      case 'number':
        toggleList('number', INSERT_ORDERED_LIST_COMMAND);
        break;
      case 'check':
        toggleList('check', INSERT_CHECK_LIST_COMMAND);
        break;
      default:
        break;
    }
  }, [editor, blockType, setErrorMessage, setShowErrorModal]);

  // Handler para link
  const handleLinkToggle = useCallback(() => {
    if (!editor) {
      setErrorMessage('Editor is not available. Please try again.');
      setShowErrorModal(true);
      return;
    }
    
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      let showModal = false;
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          showModal = true;
        }
      });

      if (showModal) {
        setShowLinkModal(true);
      } else {
        setErrorMessage('Please select text to create a link.');
        setShowErrorModal(true);
      }
    }
  }, [editor, isLink, setErrorMessage, setShowErrorModal]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor) {
      setErrorMessage('Editor is not available. Please try again.');
      setShowErrorModal(true);
      return;
    }
    if (!linkUrl.trim()) return;

        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    const isValidUrl = urlPattern.test(linkUrl.trim()) || linkUrl.startsWith('mailto:');
    
    if (isValidUrl) {
      const finalUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, finalUrl);
      setShowLinkModal(false);
      setLinkUrl('');
    } else {
      setErrorMessage('Please enter a valid URL.');
      setShowErrorModal(true);
    }
  }, [editor, linkUrl, setErrorMessage, setShowErrorModal]);

  // Função para fechar todos os menus
  const closeAllMenus = useCallback(() => {
    setShowFormatMenu(false);
    setShowMoreMenu(false);
  }, []);

  // Memoized formatPopover
  const formatPopover = useMemo(() => (
    <Popover id="format-popover" className="bg-dark text-warning border-0">
      <Popover.Body className="d-flex flex-column align-items-start gap-2 p-3">
        <div className="d-flex flex-column gap-1 w-100">
          
        <div className="w-100">
          <div className="d-flex w-100 gap-1">
            <BootstrapButton size="sm" className="flex-fill" variant={textFormats.bold ? 'warning' : 'outline-secondary'} onClick={() => handleTextFormat('bold')} title="Bold (Ctrl+B)">
              <i className="bi bi-type-bold"></i>
            </BootstrapButton>
            <BootstrapButton size="sm" className="flex-fill" variant={textFormats.italic ? 'warning' : 'outline-secondary'} onClick={() => handleTextFormat('italic')} title="Italic (Ctrl+I)">
              <i className="bi bi-type-italic"></i>
            </BootstrapButton>
            <BootstrapButton size="sm" className="flex-fill" variant={textFormats.underline ? 'warning' : 'outline-secondary'} onClick={() => handleTextFormat('underline')} title="Underline (Ctrl+U)">
              <i className="bi bi-type-underline"></i>
            </BootstrapButton>
            <BootstrapButton size="sm" className="flex-fill" variant={textFormats.strikethrough ? 'warning' : 'outline-secondary'} onClick={() => handleTextFormat('strikethrough')} title="Strikethrough">
              <i className="bi bi-type-strikethrough"></i>
            </BootstrapButton>
            <BootstrapButton size="sm" className="flex-fill" variant={textFormats.code ? 'warning' : 'outline-secondary'} onClick={() => handleTextFormat('code')} title="Code">
              <i className="bi bi-code"></i>
            </BootstrapButton>
          </div>
          <hr className="w-100 my-1" style={{ borderColor: 'var(--separator-secondary)' }} />
        </div>
          <BootstrapButton variant={blockType === 'paragraph' ? 'warning' : 'outline-secondary'} size="sm" className="text-start mb-1" onClick={() => { handleBlockTypeChange('paragraph'); closeAllMenus(); }}>
            <i className="bi bi-paragraph me-2"></i>Normal
          </BootstrapButton>
          <BootstrapButton variant={blockType === 'h1' ? 'warning' : 'outline-secondary'} size="sm" className="text-start mb-1" onClick={() => { handleBlockTypeChange('h1'); closeAllMenus(); }}>
            <i className="bi bi-type-h1 me-2"></i>Title
          </BootstrapButton>
          <BootstrapButton variant={blockType === 'quote' ? 'warning' : 'outline-secondary'} size="sm" className="text-start mb-1" onClick={() => { handleBlockTypeChange('quote'); closeAllMenus(); }}>
            <i className="bi bi-quote me-2"></i>Quote
          </BootstrapButton>
          <BootstrapButton variant={blockType === 'bullet' ? 'warning' : 'outline-secondary'} size="sm" className="text-start mb-1" onClick={() => { handleBlockTypeChange('bullet'); closeAllMenus(); }}>
            <i className="bi bi-list-ul me-2"></i>Bullet list
          </BootstrapButton>
          <BootstrapButton variant={blockType === 'number' ? 'warning' : 'outline-secondary'} size="sm" className="text-start mb-1" onClick={() => { handleBlockTypeChange('number'); closeAllMenus(); }}>
            <i className="bi bi-list-ol me-2"></i>Numbered list
          </BootstrapButton>
        </div>
        
      </Popover.Body>
    </Popover>
  ), [blockType, handleBlockTypeChange, closeAllMenus, textFormats, handleTextFormat]);

  // 1. Reusable ToolbarButton component
  const ToolbarButton = ({
    icon,
    label,
    onClick,
    active,
    ariaLabel,
    title,
    style,
    ...props
  }) => (
    <BootstrapButton
      className="toolbar-button d-flex align-items-center justify-content-center"
      onClick={onClick}
      title={title || label}
      aria-label={ariaLabel || label}
      aria-pressed={active}
      style={style}
      {...props}
    >
      <i className={`bi ${icon}`} aria-hidden="true"></i>
      {label && !icon && label}
    </BootstrapButton>
  );

  // Botões que estarão sempre no menu "Mais opções"
  const alwaysInMenuButtons = useMemo(() => [
    {
      id: 'link',
      icon: 'bi-link-45deg',
      label: null,
      onClick: handleLinkToggle,
      isActive: isLink,
      title: isLink ? "Remove Link" : "Add Link",
    },
    {
      id: 'image',
      icon: 'bi-image-fill',
      label: null,
      onClick: () => editor.dispatchCommand(INSERT_IMAGE_COMMAND, undefined),
      isActive: false,
      title: "Insert Image",
    },
  ], [handleLinkToggle, isLink]);

  // Botões que serão responsivos
  const responsiveButtons = useMemo(() => [
    {
      id: 'check',
      icon: 'bi-check2-square',
      label: null,
      onClick: () => handleBlockTypeChange('check'),
      isActive: blockType === 'check',
      title: "Checklist",
    },
    {
      id: 'highlight',
      icon: 'bi-highlighter',
      label: null,
      onClick: () => handleTextFormat('highlight'),
      isActive: textFormats.highlight,
      title: "Highlight",
    },
    {
      id: 'share',
      icon: 'bi-box-arrow-up',
      label: null,
      onClick: onShare,
      isActive: false,
      title: "Share note",
    },
    {
      id: 'delete',
      icon: 'bi-trash2-fill',
      label: null,
      onClick: onDelete,
      isActive: false,
      title: "Move note to trash",
    },
  ], [blockType, handleBlockTypeChange, textFormats.highlight, handleTextFormat, onShare, onDelete]);

  // 3. Use o hook apenas com os botões responsivos
  const { visibleItems, hiddenItems } = useResponsiveToolbar(toolbarRef, responsiveButtons);

  // Combina os botões que estão sempre escondidos com os que ficam escondidos responsivamente
  const allHiddenItems = useMemo(() => [
    ...alwaysInMenuButtons,
    ...hiddenItems
  ], [alwaysInMenuButtons, hiddenItems]);

  const moreMenuOverlay = useMemo(() => (
    <Popover id="more-menu-popover" className="bg-dark text-warning border-0">
      <Popover.Body className="d-flex flex-column align-items-start gap-2 p-3">
        <div className="d-flex flex-column gap-1 w-100">
          {allHiddenItems.map(btn => (
            <BootstrapButton
              key={btn.id}
              variant={btn.isActive ? 'warning' : 'outline-secondary'}
              size="sm"
              className="text-start mb-1"
              onClick={() => { btn.onClick(); setShowMoreMenu(false); }}
            >
              <i className={`bi ${btn.icon} me-2`}></i>
              {btn.title}
            </BootstrapButton>
          ))}
        </div>
      </Popover.Body>
    </Popover>
  ), [allHiddenItems, setShowMoreMenu]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <div 
        className="toolbar-container d-flex align-items-center" 
        ref={toolbarRef}
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderColor: 'var(--separator-primary)',
          gap: '8px',
          padding: '5px 16px'
        }} 
        role="toolbar" 
        aria-label="Text formatting"
      >
        {isEditable && (
          <>
            {/* Botão de Formatação de Texto (Aa) - sempre visível */}
            <OverlayTrigger 
              trigger="click" 
              placement="bottom-start" 
              show={showFormatMenu} 
              onToggle={() => setShowFormatMenu(!showFormatMenu)} 
              overlay={formatPopover} 
              rootClose
            >
              <BootstrapButton 
                ref={formatMenuTarget} 
                className="toolbar-button text-format-button d-flex align-items-center justify-content-center" 
                onClick={() => setShowFormatMenu(!showFormatMenu)} 
                aria-label="Text formatting options"
                aria-expanded={showFormatMenu}
                aria-controls="format-popover"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: showFormatMenu ? 'var(--button-hover)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '18px',
                  fontWeight: '500'
                }}
              >
                Aa
              </BootstrapButton>
            </OverlayTrigger>

            {/* Render visible buttons */}
            {visibleItems.map(btn => (
              <ToolbarButton
                key={btn.id}
                icon={btn.icon}
                onClick={btn.onClick}
                active={btn.isActive}
                title={btn.title}
                ariaLabel={btn.title}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: btn.isActive ? 'var(--accent-primary)' : 'transparent',
                  color: btn.isActive ? 'var(--text-contrast)' : 'var(--text-primary)',
                  fontSize: '18px'
                }}
              />
            ))}

            {/* "More" menu for hidden buttons */}
            {allHiddenItems.length > 0 && (
              <OverlayTrigger 
                trigger="click" 
                placement="bottom-end" 
                show={showMoreMenu} 
                onToggle={() => setShowMoreMenu(!showMoreMenu)} 
                overlay={moreMenuOverlay}
                rootClose
              >
                <BootstrapButton 
                  ref={moreMenuTarget} 
                  className="toolbar-button d-flex align-items-center justify-content-center" 
                  onClick={() => setShowMoreMenu(!showMoreMenu)} 
                  aria-label="More options"
                  aria-expanded={showMoreMenu}
                  aria-controls="more-menu-popover"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: showMoreMenu ? 'var(--button-hover)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '18px'
                  }}
                >
                  <i className="bi bi-three-dots" aria-hidden="true"></i>
                </BootstrapButton>
              </OverlayTrigger>
            )}
          </>
        )}

        {/* Separador visual */}
        <div style={{
          width: '1px',
          height: '24px',
          backgroundColor: 'var(--separator-secondary)',
          margin: '0 4px',
          opacity: 0.6
        }}></div>

        {/* Botão de Lock/Unlock */}
        <BootstrapButton
          className="toolbar-button d-flex align-items-center justify-content-center"
          onClick={() => setIsEditable(!isEditable)}
          title={isEditable ? "Change to read-only mode" : "Change to edit mode"}
          aria-label={isEditable ? "Change to read-only mode" : "Change to edit mode"}
        >
          <i className={isEditable ? "bi bi-unlock" : "bi bi-lock"} aria-hidden="true"></i>
        </BootstrapButton>
      </div>
      
      {/* Modal para adicionar link */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Add Link"
        footer={
          <>
            <CustomButton
              variant="secondary"
              onClick={() => setShowLinkModal(false)}
              style={{ minWidth: 92 }}
            >
              Cancel
            </CustomButton>
            <CustomButton
              className="btn-primary"
              onClick={handleLinkSubmit}
              disabled={!linkUrl.trim()}
              style={{ minWidth: 92 }}
            >
              Add Link
            </CustomButton>
          </>
        }
      >
        <Form.Group>
          <Form.Label>URL</Form.Label>
          <Form.Control
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLinkSubmit();
              }
            }}
            className="form-control custom-search"
            autoFocus
          />
          <Form.Text className="text-muted">
            Enter a web address or email (mailto:email@example.com)
          </Form.Text>
        </Form.Group>
      </Modal>

      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Attention"
      >
        <p>{errorMessage}</p>
      </Modal>
    </>
  );
};

export default EditorToolbar;