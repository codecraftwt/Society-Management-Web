import React from "react";
import GlobalModal from "./common/GlobalModal";

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = "md",
  footer,
  showFooter,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  submitLoading,
  submitDisabled,
  submitIcon,
  submitVariant,
  className,
  style,
  bodyStyle,
}) {
  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      size={size}
      footer={footer}
      showFooter={showFooter}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      submitLoading={submitLoading}
      submitDisabled={submitDisabled}
      submitIcon={submitIcon}
      submitVariant={submitVariant}
      className={className}
      style={style}
      bodyStyle={bodyStyle}
    >
      {children}
    </GlobalModal>
  );
}
