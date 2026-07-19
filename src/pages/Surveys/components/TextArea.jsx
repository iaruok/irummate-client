function TextArea({label, placeholder, value, onChange}) {
    return (
        <div className="flex flex-col gap-2 min-w-0">
            <label className="block text-sm font-sans font-bold text-fg-basic">
                {label}
            </label>
            <textarea
                className="h-[150px] bg-white rounded-textarea font-sans text-xs text-fg-basic"
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
            />
        </div>
    );
}

export default TextArea;