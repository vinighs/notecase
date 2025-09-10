import { useState, useLayoutEffect, useCallback, useEffect, useMemo } from 'react';

// Larguras ajustadas baseadas no CSS real
const BUTTON_WIDTHS = {
  regular: 48 + 8, // 48px + 8px gap
  compact: 40 + 6,  // 40px + 6px gap (mobile)
  mobile: 40 + 4    // 40px + 4px gap (very small screens)
};

const MORE_BUTTON_WIDTH = 50; // pixels para o botão "More"
const SEPARATOR_WIDTH = 25; // 1px + margens (0 8px)
const CONTAINER_PADDING = 32; // 16px * 2 (padding lateral)
const SAFETY_MARGIN = 20; // Margem de segurança para evitar overflow

export const useResponsiveToolbar = (containerRef, allItems) => {
  const [visibleItems, setVisibleItems] = useState([]);
  const [hiddenItems, setHiddenItems] = useState([]);

  // Detecta o tamanho da tela para usar as larguras corretas
  const [screenSize, setScreenSize] = useState(() => {
    if (typeof window === 'undefined') return 'regular';
    if (window.innerWidth <= 480) return 'mobile';
    if (window.innerWidth <= 768) return 'compact';
    return 'regular';
  });

  // Atualiza o tamanho da tela
  useEffect(() => {
    const updateScreenSize = () => {
      if (window.innerWidth <= 480) setScreenSize('mobile');
      else if (window.innerWidth <= 768) setScreenSize('compact');
      else setScreenSize('regular');
    };

    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Memoização mais eficiente usando uma key baseada nos IDs
  const memoizedItems = useMemo(() => {
    return allItems;
  }, [allItems.map(item => `${item.id}-${item.isActive}`).join(',')]);

  const calculateItemWidth = useCallback((item) => {
    if (item.type === 'divider') {
      return screenSize === 'mobile' ? 0 : SEPARATOR_WIDTH; // Separador oculto no mobile
    }
    return BUTTON_WIDTHS[screenSize];
  }, [screenSize]);

  const updateToolbar = useCallback(() => {
    if (!containerRef.current || memoizedItems.length === 0) {
      return;
    }

    // Obtém a largura disponível do container pai (não do toolbar)
    const parentContainer = containerRef.current.parentElement;
    if (!parentContainer) return;

    // Calcula o espaço disponível para a toolbar
    // Considera o espaço ocupado pelo botão "Nova Nota" (60px + gap)
    const parentWidth = parentContainer.offsetWidth;
    const newNoteButtonSpace = 60 + 12; // 48px botão + 12px gap
    const availableWidth = parentWidth - newNoteButtonSpace - SAFETY_MARGIN;

    // Se o espaço disponível é muito pequeno, esconde tudo
    if (availableWidth < 100) {
      setVisibleItems([]);
      setHiddenItems(memoizedItems);
      return;
    }

    let totalWidth = CONTAINER_PADDING; // Inicia com o padding do container
    let visibleCount = 0;
    const itemWidths = [];

    // Calcula a largura de cada item
    for (let i = 0; i < memoizedItems.length; i++) {
      const item = memoizedItems[i];
      const itemWidth = calculateItemWidth(item);
      itemWidths.push(itemWidth);
    }

    // Determina quantos itens cabem
    for (let i = 0; i < memoizedItems.length; i++) {
      const itemWidth = itemWidths[i];
      const remainingItems = memoizedItems.length - i - 1;
      
      // Se há itens restantes, considera o espaço do botão "More"
      const needsMoreButton = remainingItems > 0;
      const moreButtonSpace = needsMoreButton ? MORE_BUTTON_WIDTH : 0;
      
      const totalNeededWidth = totalWidth + itemWidth + moreButtonSpace;
      
      if (totalNeededWidth > availableWidth) {
        break;
      }
      
      totalWidth += itemWidth;
      visibleCount++;
    }

    // Se todos os itens cabem, não precisa do botão "More"
    if (visibleCount === memoizedItems.length) {
      setVisibleItems(memoizedItems);
      setHiddenItems([]);
      return;
    }

    // Se não cabe nenhum item mesmo sem o botão "More", força pelo menos um
    if (visibleCount === 0 && memoizedItems.length > 0) {
      // Verifica se pelo menos o primeiro item + botão "More" cabem
      const firstItemWidth = itemWidths[0] || 0;
      if (CONTAINER_PADDING + firstItemWidth + MORE_BUTTON_WIDTH <= availableWidth) {
        visibleCount = 1;
      }
    }

    const newVisibleItems = memoizedItems.slice(0, Math.max(0, visibleCount));
    const newHiddenItems = memoizedItems.slice(Math.max(0, visibleCount));

    setVisibleItems(newVisibleItems);
    setHiddenItems(newHiddenItems);
  }, [containerRef, memoizedItems, calculateItemWidth]);

  // Executa quando os itens mudam
  useEffect(() => {
    updateToolbar();
  }, [updateToolbar]);

  useLayoutEffect(() => {
    updateToolbar();

    // Observer no container pai para detectar mudanças de tamanho
    const resizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        updateToolbar();
      });
    });

    const currentContainer = containerRef.current;
    const parentContainer = currentContainer?.parentElement;
    
    if (parentContainer) {
      resizeObserver.observe(parentContainer);
    }

    // Também observa o próprio container como fallback
    if (currentContainer) {
      resizeObserver.observe(currentContainer);
    }

    // Escuta redimensionamento da janela
    const handleResize = () => {
      requestAnimationFrame(() => updateToolbar());
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      if (parentContainer) {
        resizeObserver.unobserve(parentContainer);
      }
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [updateToolbar]);

  return { visibleItems, hiddenItems };
};