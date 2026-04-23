// Entry point for the full @mikata/ui stylesheet. Pulls in the reset
// plus every component's CSS by re-importing the library index as a
// side effect — each component TSX does `import './X.css'` at its
// top, so tsup aggregates all of them into this entry's CSS bundle.
// The result is a single `@mikata/ui/styles.css` that users can drop
// into their app with one import and get working styles for every
// component out of the box.
import './css/reset.css';
import './index';
