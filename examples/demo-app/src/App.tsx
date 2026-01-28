import React from 'react';
import GettingStarted from './content/getting-started.mdx';
import ApiReference from './content/api-reference.mdx';

// Custom components for MDX
const components = {
  Callout: ({ children, type = 'info' }: { children: React.ReactNode; type?: string }) => (
    <div className="callout" data-type={type}>
      {children}
    </div>
  ),
  CodeBlock: ({ children }: { children: React.ReactNode }) => (
    <pre>
      <code>{children}</code>
    </pre>
  ),
};

export default function App() {
  return (
    <div>
      <header>
        <h1>MDX DevTools Demo</h1>
        <p>
          Open Chrome DevTools and look for the <strong>MDX</strong> tab to inspect components.
        </p>
      </header>

      <main>
        <section>
          <GettingStarted components={components} />
        </section>

        <hr style={{ margin: '2rem 0' }} />

        <section>
          <ApiReference components={components} />
        </section>
      </main>
    </div>
  );
}
