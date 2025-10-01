'use client'

import { useEffect, useRef, useState } from 'react'

interface QuillEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function QuillEditor({ value, onChange, placeholder }: QuillEditorProps) {
  const [isClient, setIsClient] = useState(false)
  const [isQuillLoaded, setIsQuillLoaded] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const quillInstanceRef = useRef<any>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import Quill to avoid SSR issues
    const loadQuill = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { default: Quill } = await import('quill')
          
          // Store Quill on window object for reuse
          ;(window as any).Quill = Quill
          setIsQuillLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load Quill:', error)
      }
    }
    
    if (!isQuillLoaded && !(window as any).Quill) {
      loadQuill()
    } else if ((window as any).Quill) {
      setIsQuillLoaded(true)
    }
  }, [isQuillLoaded])

  useEffect(() => {
    if (!isQuillLoaded || !editorRef.current || quillInstanceRef.current) return

    const Quill = (window as any).Quill
    if (!Quill) return

    // Register custom font sizes
    const Size = Quill.import('attributors/style/size')
    Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '30px', '32px', '36px', '40px', '44px', '48px']
    Quill.register(Size, true)

    // Register custom fonts with proper CSS values
    const Font = Quill.import('attributors/style/font')
    Font.whitelist = [
      'Arial', 'Comic Sans MS', 'Courier New', 'Georgia', 'Helvetica', 'Lucida Sans Unicode',
      'Times New Roman', 'Verdana', 'system-ui', 'Inter', 'Roboto', 'Open Sans', 'Lato',
      'Montserrat', 'Poppins', 'Source Sans Pro', 'Nunito', 'PT Sans', 'Ubuntu',
      'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Monaco', 'Menlo'
    ]
    Quill.register(Font, true)

    // Quill configuration
    const toolbarOptions = [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': Font.whitelist }],
      [{ 'size': Size.whitelist }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['image'],
      ['clean']
    ]

    try {
      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: placeholder || 'Start typing your notes...',
        modules: {
          toolbar: {
            container: toolbarOptions,
            handlers: {
              table: function() {
                const tableModule = (this as any).quill.getModule('table')
                tableModule.insertTable(3, 3)
              }
            }
          },
          table: true
        },
      })

      // Add custom table button
      const toolbar = quill.getModule('toolbar')
      const tableButton = document.createElement('button')
      tableButton.innerHTML = '⊞'
      tableButton.title = 'Insert Table'
      tableButton.type = 'button'
      tableButton.className = 'ql-table'
      tableButton.addEventListener('click', () => {
        const rows = prompt('Number of rows:', '3')
        const cols = prompt('Number of columns:', '3')
        if (rows && cols) {
          insertTable(quill, parseInt(rows), parseInt(cols))
        }
      })
      
      const toolbarElement = editorRef.current.previousSibling as HTMLElement
      if (toolbarElement) {
        toolbarElement.appendChild(tableButton)
      }

      // Set initial content
      if (value) {
        quill.root.innerHTML = value
      }

      // Handle content changes
      quill.on('text-change', () => {
        const content = quill.root.innerHTML
        onChange(content)
      })

      quillInstanceRef.current = quill
    } catch (error) {
      console.error('Failed to initialize Quill:', error)
    }

    // Cleanup
    return () => {
      if (quillInstanceRef.current) {
        quillInstanceRef.current = null
      }
    }
  }, [isQuillLoaded, placeholder])

  // Update content when value prop changes
  useEffect(() => {
    if (quillInstanceRef.current && value !== quillInstanceRef.current.root.innerHTML) {
      const quill = quillInstanceRef.current
      const currentSelection = quill.getSelection()
      quill.root.innerHTML = value
      if (currentSelection) {
        quill.setSelection(currentSelection)
      }
    }
  }, [value])

  const insertTable = (quill: any, rows: number, cols: number) => {
    const range = quill.getSelection()
    if (!range) return

    let tableHTML = '<table style="border-collapse: collapse; width: 100%;"><tbody>'
    for (let i = 0; i < rows; i++) {
      tableHTML += '<tr>'
      for (let j = 0; j < cols; j++) {
        tableHTML += '<td style="border: 1px solid #ddd; padding: 8px; min-width: 50px;">&nbsp;</td>'
      }
      tableHTML += '</tr>'
    }
    tableHTML += '</tbody></table><p><br></p>'

    quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML)
    quill.setSelection(range.index + 1)
  }

  if (!isClient || !isQuillLoaded) {
    return (
      <div className="w-full h-[650px] bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full h-[650px] relative">
        <div ref={editorRef} style={{ height: '600px' }} />
      </div>
      
      <style jsx global>{`
        .ql-editor {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
          font-size: 16px !important;
          line-height: 1.6 !important;
          min-height: 550px !important;
          background: transparent !important;
        }
        
        .ql-toolbar {
          border-top: 1px solid #e5e7eb !important;
          border-left: 1px solid #e5e7eb !important;
          border-right: 1px solid #e5e7eb !important;
          border-bottom: 1px solid #e5e7eb !important;
          border-radius: 8px 8px 0 0 !important;
        }
        
        .ql-container {
          border-left: 1px solid #e5e7eb !important;
          border-right: 1px solid #e5e7eb !important;
          border-bottom: 1px solid #e5e7eb !important;
          border-radius: 0 0 8px 8px !important;
          background: transparent !important;
        }
        
        .ql-editor.ql-blank::before {
          color: #9ca3af !important;
          font-style: italic !important;
        }
        
        .ql-snow .ql-tooltip {
          z-index: 1000 !important;
        }

        /* Font family styles - updated to use exact font names */
        .ql-font-Arial { font-family: Arial, sans-serif; }
        .ql-font-Comic\ Sans\ MS { font-family: 'Comic Sans MS', cursive; }
        .ql-font-Courier\ New { font-family: 'Courier New', monospace; }
        .ql-font-Georgia { font-family: Georgia, serif; }
        .ql-font-Helvetica { font-family: Helvetica, sans-serif; }
        .ql-font-Lucida\ Sans\ Unicode { font-family: 'Lucida Sans Unicode', sans-serif; }
        .ql-font-Times\ New\ Roman { font-family: 'Times New Roman', serif; }
        .ql-font-Verdana { font-family: Verdana, sans-serif; }
        .ql-font-system-ui { font-family: system-ui, sans-serif; }
        .ql-font-Inter { font-family: Inter, sans-serif; }
        .ql-font-Roboto { font-family: Roboto, sans-serif; }
        .ql-font-Open\ Sans { font-family: 'Open Sans', sans-serif; }
        .ql-font-Lato { font-family: Lato, sans-serif; }
        .ql-font-Montserrat { font-family: Montserrat, sans-serif; }
        .ql-font-Poppins { font-family: Poppins, sans-serif; }
        .ql-font-Source\ Sans\ Pro { font-family: 'Source Sans Pro', sans-serif; }
        .ql-font-Nunito { font-family: Nunito, sans-serif; }
        .ql-font-PT\ Sans { font-family: 'PT Sans', sans-serif; }
        .ql-font-Ubuntu { font-family: Ubuntu, sans-serif; }
        .ql-font-Fira\ Code { font-family: 'Fira Code', monospace; }
        .ql-font-JetBrains\ Mono { font-family: 'JetBrains Mono', monospace; }
        .ql-font-Source\ Code\ Pro { font-family: 'Source Code Pro', monospace; }
        .ql-font-Monaco { font-family: Monaco, monospace; }
        .ql-font-Menlo { font-family: Menlo, monospace; }

        /* Font picker dropdown - show actual font names */
        .ql-picker.ql-font .ql-picker-label[data-value="Arial"]::before { content: "Arial"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Arial"]::before { content: "Arial"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Comic Sans MS"]::before { content: "Comic Sans MS"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Comic Sans MS"]::before { content: "Comic Sans MS"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Courier New"]::before { content: "Courier New"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Courier New"]::before { content: "Courier New"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Georgia"]::before { content: "Georgia"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Georgia"]::before { content: "Georgia"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Helvetica"]::before { content: "Helvetica"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Helvetica"]::before { content: "Helvetica"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Lucida Sans Unicode"]::before { content: "Lucida Sans Unicode"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Lucida Sans Unicode"]::before { content: "Lucida Sans Unicode"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Times New Roman"]::before { content: "Times New Roman"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Times New Roman"]::before { content: "Times New Roman"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Verdana"]::before { content: "Verdana"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Verdana"]::before { content: "Verdana"; }
        .ql-picker.ql-font .ql-picker-label[data-value="system-ui"]::before { content: "System UI"; }
        .ql-picker.ql-font .ql-picker-item[data-value="system-ui"]::before { content: "System UI"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Inter"]::before { content: "Inter"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Inter"]::before { content: "Inter"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Roboto"]::before { content: "Roboto"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Roboto"]::before { content: "Roboto"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Open Sans"]::before { content: "Open Sans"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Open Sans"]::before { content: "Open Sans"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Lato"]::before { content: "Lato"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Lato"]::before { content: "Lato"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Montserrat"]::before { content: "Montserrat"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Montserrat"]::before { content: "Montserrat"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Poppins"]::before { content: "Poppins"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Poppins"]::before { content: "Poppins"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Source Sans Pro"]::before { content: "Source Sans Pro"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Source Sans Pro"]::before { content: "Source Sans Pro"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Nunito"]::before { content: "Nunito"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Nunito"]::before { content: "Nunito"; }
        .ql-picker.ql-font .ql-picker-label[data-value="PT Sans"]::before { content: "PT Sans"; }
        .ql-picker.ql-font .ql-picker-item[data-value="PT Sans"]::before { content: "PT Sans"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Ubuntu"]::before { content: "Ubuntu"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Ubuntu"]::before { content: "Ubuntu"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Fira Code"]::before { content: "Fira Code"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Fira Code"]::before { content: "Fira Code"; }
        .ql-picker.ql-font .ql-picker-label[data-value="JetBrains Mono"]::before { content: "JetBrains Mono"; }
        .ql-picker.ql-font .ql-picker-item[data-value="JetBrains Mono"]::before { content: "JetBrains Mono"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Source Code Pro"]::before { content: "Source Code Pro"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Source Code Pro"]::before { content: "Source Code Pro"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Monaco"]::before { content: "Monaco"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Monaco"]::before { content: "Monaco"; }
        .ql-picker.ql-font .ql-picker-label[data-value="Menlo"]::before { content: "Menlo"; }
        .ql-picker.ql-font .ql-picker-item[data-value="Menlo"]::before { content: "Menlo"; }

        /* Size picker dropdown styling */
        .ql-picker.ql-size .ql-picker-label::before,
        .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-value) !important;
        }

        /* Table styles */
        .ql-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        
        .ql-editor table td,
        .ql-editor table th {
          border: 1px solid #ddd;
          padding: 8px;
          min-width: 50px;
        }
        
        .ql-editor table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        
        .ql-editor table tr:nth-child(even) {
          background-color: #f9fafb;
        }
      `}</style>
    </>
  )
}
