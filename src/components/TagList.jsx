import React from 'react';
import { Button } from 'react-bootstrap';

const TagList = ({ tags, selectedTag, onSelectTag, onClearTagFilter }) => {
  return (
    <div className="tags-section mt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="sidebar-heading mb-0 text-uppercase" style={{ color: '#aaa', fontSize: '0.8rem' }}>Tags</h6>
        {selectedTag && (
          <Button
            variant="link"
            size="sm"
            onClick={onClearTagFilter}
            className="p-0 text-decoration-none"
            style={{ color: '#aaa', fontSize: '0.75rem' }}
            title="Clear tag filter"
          >
            Clear Filter
          </Button>
        )}
      </div>

      {tags && tags.length > 0 ? (
        <div className="tag-list d-flex flex-wrap" style={{ gap: '8px' }}>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-item btn btn-sm ${tag === selectedTag ? 'active-tag' : ''}`}
              onClick={() => onSelectTag(tag)}
              title={`Filter by tag: ${tag}`}
              aria-pressed={tag === selectedTag}
            >
              <i className="bi bi-hash me-1" style={{ fontSize: '0.8em' }}></i>
              <span className="tag-name">{tag}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="no-tags-message text-muted" style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>
          
        </div>
      )}
    </div>
  );
};

export default TagList;