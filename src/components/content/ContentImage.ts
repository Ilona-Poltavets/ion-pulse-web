import Image from '@tiptap/extension-image'
import { imageLayoutHtml, readImageLayout } from './imageLayout'

export const ContentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...Object.fromEntries(
        Object.entries(readImageLayout(document.createElement('img'))).map(([name, value]) => [
          name,
          {
            default: value,
            parseHTML: (element: HTMLElement) =>
              readImageLayout(element)[name as keyof ReturnType<typeof readImageLayout>],
            rendered: false,
          },
        ]),
      ),
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['img', { ...HTMLAttributes, ...imageLayoutHtml(node.attrs) }]
  },
})
