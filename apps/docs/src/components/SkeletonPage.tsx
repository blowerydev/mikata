import { useMeta } from '@mikata/kit/head';

interface SkeletonPageProps {
  title: string;
  description?: string;
}

export function SkeletonPage(props: SkeletonPageProps) {
  useMeta({ title: () => `${props.title} - Mikata` });

  return (
    <article>
      <h1>{props.title}</h1>
      {props.description ? <p>{props.description}</p> : null}
      <p>Documentation for this page is in progress.</p>
    </article>
  );
}
