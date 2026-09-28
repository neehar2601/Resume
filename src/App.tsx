import { useEffect, useState } from 'react'
import { ProgressiveDeliverySandbox } from './components/ProgressiveDeliverySandbox'
import { CafeWebsiteSandbox } from './components/CafeWebsiteSandbox'
import { ImageGallerySandbox } from './components/ImageGallerySandbox'
import { CollegeFestSandbox } from './components/CollegeFestSandbox'
import { ProjectCard } from './components/ProjectCard'
import { SystemMap } from './components/SystemMap'
import { projects } from './data/projects'
import './index.css'

const links = {
  github: 'https://github.com/neehar2601',
  linkedin: 'https://www.linkedin.com/in/neehara-nellikalaya',
  medium: 'https://medium.com/@ngn22666',
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (path === '/sandbox/progressive-delivery') {
    return <ProgressiveDeliverySandbox />
  }

  if (path === '/sandbox/cafe-aws') {
    return <CafeWebsiteSandbox />
  }

  if (path === '/sandbox/image-gallery') {
    return <ImageGallerySandbox />
  }

  if (path === '/sandbox/collegefest') {
    return <CollegeFestSandbox />
  }

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="container nav-inner">
          <a className="brand" href="#top">neehara<span className="brand-dot">.</span>dev</a>
          <div className="nav-links">
            <a href="#projects">Projects</a>
            <a href="#experience">Experience</a>
            <a href="#skills">Skills</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </nav>

      <main id="top">
        <header className="hero">
          <div className="container hero-grid">
            <div>
              <div className="kicker"><span className="kicker-dot" /> status: available for cloud / devops opportunities</div>
              <h1>I build systems that ship without holding their breath.</h1>
              <p className="hero-copy">
                Cloud / DevOps engineer building with <strong>AWS</strong>, <strong>Kubernetes</strong>, <strong>CI/CD automation</strong> and validation tooling — with hands-on work at <strong>TCS</strong> and <strong>Intel</strong>.
              </p>
              <div className="cta-row">
                <a className="button primary" href="/sandbox/progressive-delivery">Enter the sandbox →</a>
                <a className="button" href={links.github} target="_blank" rel="noreferrer">GitHub ↗</a>
                <a className="button" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
              </div>
              <SystemMap />
            </div>

            <div className="hero-terminal" aria-label="Simulated deployment terminal">
              <div className="term-bar">
                <span className="term-dot" /><span className="term-dot" /><span className="term-dot" />
                <span className="term-title">sandbox / progressive-delivery</span>
              </div>
              <div className="term-body">
                <div>$ <b>kubectl</b> get rollout</div>
                <div>NAME&nbsp;&nbsp;&nbsp;&nbsp;STATUS&nbsp;&nbsp;&nbsp;CANARY</div>
                <div>cafe-web&nbsp;&nbsp;<span className="term-warn">progressing</span>&nbsp;&nbsp;10%</div>
                <div>&nbsp;</div>
                <div>$ <b>flagger status</b></div>
                <div>analysis window:&nbsp;30s</div>
                <div>error rate:&nbsp;&nbsp;&nbsp;<span className="term-ok">0.3%</span></div>
                <div>latency:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="term-ok">138ms</span></div>
                <div>&nbsp;</div>
                <div><span className="term-ok">✓ health threshold satisfied</span></div>
                <div><span className="term-ok">✓ canary promoted</span></div>
              </div>
            </div>
          </div>
        </header>

        <section className="section" id="projects">
          <div className="container">
            <div className="section-header">
              <h2>Featured systems</h2>
              <span>04 — operate them, don't just read them</span>
              <div className="section-rule" />
            </div>
            <div className="project-grid">
              {projects.map((project) => <ProjectCard project={project} key={project.id} />)}
            </div>
          </div>
        </section>

        <section className="section" id="experience">
          <div className="container">
            <div className="section-header">
              <h2>Experience</h2>
              <span>hands-on engineering context</span>
              <div className="section-rule" />
            </div>
            <div className="experience">
              <div className="job">
                <div className="job-date">JUN 2025 — APR 2026</div>
                <div>
                  <div className="job-role">Graduate Technical Intern</div>
                  <div className="job-company">Intel</div>
                  <p className="job-desc">Automated power / performance validation and engineering workflows with Python, PowerShell, Batch, XMLCLI and repeatable validation tooling.</p>
                </div>
              </div>
              <div className="job">
                <div className="job-date">SEP 2022 — JUL 2024</div>
                <div>
                  <div className="job-role">System / Cloud Operations</div>
                  <div className="job-company">Tata Consultancy Services</div>
                  <p className="job-desc">Worked across AWS workloads, incident operations and workflow automation; supported EC2, S3, VPC, RDS and service-management processes.</p>
                </div>
              </div>
              <div className="job">
                <div className="job-date">2024 — 2026</div>
                <div>
                  <div className="job-role">M.E. — Cloud Computing</div>
                  <div className="job-company">Manipal School of Information Sciences</div>
                  <p className="job-desc">Focused on cloud platforms, DevOps, distributed systems, Kubernetes and hands-on platform engineering projects.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="skills">
          <div className="container">
            <div className="section-header">
              <h2>Skills as a system</h2>
              <span>not just a keyword wall</span>
              <div className="section-rule" />
            </div>
            <div className="skills-layout">
              <SkillGroup title="cloud" skills={['AWS', 'EC2', 'S3', 'RDS', 'VPC', 'Lambda', 'CloudWatch', 'CloudFormation']} />
              <SkillGroup title="delivery" skills={['Jenkins', 'GitHub Actions', 'GitLab CI', 'Docker', 'Helm', 'Argo CD', 'Argo Rollouts']} />
              <SkillGroup title="platform" skills={['Kubernetes', 'Istio', 'Terraform', 'Ansible', 'Linux', 'Shell', 'PowerShell']} />
              <SkillGroup title="observability / code" skills={['Prometheus', 'Grafana', 'ELK', 'Python', 'C/C++', 'Java', 'SQL']} />
            </div>
          </div>
        </section>

        <section className="section" id="contact">
          <div className="container">
            <div className="cta-panel">
              <div className="kicker"><span className="kicker-dot" /> next system to build</div>
              <h2>Make the portfolio itself a DevOps project.</h2>
              <p>The portfolio now has a dedicated Progressive Delivery lab. The sandbox now covers progressive delivery, AWS architecture, the Image Gallery evolution and the CollegeFest container deployment workflow.</p>
              <div className="cta-row">
                <a className="button primary" href={links.github} target="_blank" rel="noreferrer">View source on GitHub ↗</a>
                <a className="button" href={links.medium} target="_blank" rel="noreferrer">Read the write-ups ↗</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-copy">NEEHARA.DEV / CLOUD / DEVOPS / SANDBOX v0.5.7</div>
          <div className="footer-links">
            <a href={links.github} target="_blank" rel="noreferrer">GitHub</a>
            <a href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            <a href={links.medium} target="_blank" rel="noreferrer">Medium</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SkillGroup({ title, skills }: { title: string; skills: string[] }) {
  return (
    <div className="skill-group">
      <h3>{title}</h3>
      <div className="skill-chips">{skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
    </div>
  )
}
