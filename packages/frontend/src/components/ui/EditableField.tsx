'use client';

import { useState, ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Input } from './Input';
import { Textarea } from './Textarea';

interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  icon?: ReactNode;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'password' | 'datetime';
  required?: boolean;
  emptyText?: string;
  className?: string;
  showEditIcon?: boolean;
  multiline?: boolean;
  renderValue?: (value: string) => ReactNode;
  renderInput?: (props: {
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    autoFocus: boolean;
  }) => ReactNode;
}

export function EditableField({
  label,
  value,
  icon,
  onSave,
  placeholder = 'Klicken zum Bearbeiten...',
  type = 'text',
  required = false,
  emptyText,
  className = '',
  showEditIcon = true,
  multiline = false,
  renderValue,
  renderInput,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Error handling durch parent
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const displayValue = value || emptyText || placeholder;
  const hasValue = value && value.trim().length > 0;

  return (
    <div className={`px-4 py-4 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {renderInput ? (
            renderInput({
              value: editValue,
              onChange: setEditValue,
              onBlur: handleSave,
              autoFocus: true,
            })
          ) : multiline ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              placeholder={placeholder}
              className="w-full resize-none"
              rows={3}
              autoFocus
              disabled={saving}
            />
          ) : (
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              placeholder={placeholder}
              className="w-full"
              autoFocus
              disabled={saving}
            />
          )}
          {saving && (
            <div className="text-xs text-muted-foreground">Speichere...</div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-auto p-0 justify-start text-left flex-1"
          >
            {renderValue && hasValue ? (
              renderValue(value!)
            ) : hasValue ? (
              <span className="text-foreground">{displayValue}</span>
            ) : (
              <span className="text-muted-foreground italic">{emptyText || placeholder}</span>
            )}
          </Button>
          {hasValue && showEditIcon && (
            <IconButton
              onClick={() => setIsEditing(true)}
              icon={<Pencil className="w-4 h-4" />}
              variant="ghost"
              size="sm"
              aria-label={`${label} bearbeiten`}
              title={`${label} bearbeiten`}
            />
          )}
        </div>
      )}
    </div>
  );
}
