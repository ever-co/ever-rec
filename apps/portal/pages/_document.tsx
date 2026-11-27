import { ReactElement } from 'react';
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';
import { ServerStyleSheet } from 'styled-components';
import { documentLanguageScript } from 'i18n/direction';

export default class CustomDocument extends Document<{
  styleTags: ReactElement[];
}> {
  static async getInitialProps(
    ctx: DocumentContext,
  ): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
      });

    const initialProps = await Document.getInitialProps(ctx);

    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          {sheet.getStyleElement()}
        </>
      ),
    };
  }

  render() {
    return (
      // next-themes sets the theme class on <html> before React hydrates; the script below sets
      // `lang` and `dir` for the reader's language (right to left for Arabic and Hebrew).
      <Html lang="en" dir="ltr" suppressHydrationWarning>
        <Head>
          <script
            // A fixed string built from the language list, no outside input.
            dangerouslySetInnerHTML={{ __html: documentLanguageScript }}
          />
          {this.props.styles}
        </Head>
        <body className="rec-next scroll-div">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
