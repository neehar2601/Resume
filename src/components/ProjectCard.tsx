import { useState } from 'react'
import type { Project } from '../data/projects'
import { Pipeline } from './Pipeline'

export function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = useState(project.id === 'progressive')
  return (
    <article className={`project-card ${open ? 'open' : ''}`}>
      <button className="project-head" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div>
          <div className="project-kicker">project {project.index}</div>
          <div className="project-title">{project.title}</div>
          <div className="project-subtitle">{project.subtitle}</div>
        </div>
        <div className="project-chevron">⌄</div>
      </button>
      <div className="project-body">
        <div className="project-body-inner">
          <div className="project-content">
            <p className="project-description">{project.description}</p>
            <div className="tags">{project.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
            {project.id === 'progressive' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/progressive-delivery">Open full sandbox →</a>
              </div>
            )}
            <Pipeline project={project} />
          </div>
        </div>
      </div>
    </article>
  )
}
