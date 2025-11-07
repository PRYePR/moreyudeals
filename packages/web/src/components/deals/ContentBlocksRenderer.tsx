import Image from 'next/image'
import { ContentBlock } from '@/lib/db/types'

interface ContentBlocksRendererProps {
  blocks: ContentBlock[] | null
}

export default function ContentBlocksRenderer({ blocks }: ContentBlocksRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null
  }

  return (
    <div className="prose prose-lg max-w-none">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                {block.content}
              </p>
            )

          case 'heading':
            const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements
            const headingClasses: Record<number, string> = {
              1: 'text-3xl font-bold mt-8 mb-4 text-gray-900',
              2: 'text-2xl font-bold mt-6 mb-3 text-gray-900',
              3: 'text-xl font-semibold mt-5 mb-2 text-gray-900',
              4: 'text-lg font-semibold mt-4 mb-2 text-gray-800',
              5: 'text-base font-semibold mt-3 mb-2 text-gray-800',
              6: 'text-sm font-semibold mt-2 mb-1 text-gray-800',
            }
            const level = block.level && headingClasses[block.level] ? block.level : 2
            return (
              <HeadingTag key={index} className={headingClasses[level]}>
                {block.content}
              </HeadingTag>
            )

          case 'list':
            if (!block.items || block.items.length === 0) return null
            return (
              <ul key={index} className="list-disc pl-6 mb-4 space-y-2">
                {block.items.map((item, i) => (
                  <li key={i} className="text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            )

          case 'image':
            if (!block.src) return null
            return (
              <div key={index} className="my-6">
                <div className="relative w-full h-auto rounded-lg overflow-hidden shadow-md">
                  <Image
                    src={block.src}
                    alt={block.alt || 'Deal image'}
                    width={800}
                    height={450}
                    className="w-full h-auto"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                </div>
                {block.alt && (
                  <p className="text-sm text-gray-500 text-center mt-2 italic">
                    {block.alt}
                  </p>
                )}
              </div>
            )

          case 'blockquote':
            return (
              <blockquote
                key={index}
                className="border-l-4 border-primary-500 pl-4 py-2 my-4 italic text-gray-700 bg-gray-50 rounded-r"
              >
                {block.content}
              </blockquote>
            )

          case 'code':
            return (
              <pre
                key={index}
                className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto"
              >
                <code className={block.language ? `language-${block.language}` : ''}>
                  {block.content}
                </code>
              </pre>
            )

          default:
            // Unknown block type - render as plain text or skip
            if ('content' in block && block.content) {
              return (
                <div key={index} className="mb-4 text-gray-700">
                  {block.content}
                </div>
              )
            }
            return null
        }
      })}
    </div>
  )
}
