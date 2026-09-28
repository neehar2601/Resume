# Neehara DevOps Sandbox — CollegeFest v0.5.7

## CollegeFest Deployment Sandbox v0.5.7

The CollegeFest lab now focuses on the concrete deployment workflow used for the site:

```text
Private GitHub
     ↓
  Jenkins
     ↓
Docker build
     ↓
BUILD_NUMBER tag
     ↓
Docker Hub
     ↓
Jenkins updates docker-compose.yml
     ↓
┌───────────────────────────────────────┐
│                EC2                    │
│                                       │
│ docker-compose.yml                    │
│   image: neehar/felicity:<BUILD>      │
│                                       │
│ TLS certificates                      │
│   /etc/letsencrypt/...                │
│   mounted read-only                   │
│                                       │
│ Docker Compose → Flask container      │
└───────────────────────────────────────┘
     ↓
 HTTPS health check
     ↓
    LIVE
```

### Why this architecture?

**Docker** — package the Flask runtime and Python dependencies into a reproducible image.

**Docker Hub** — store and distribute the exact versioned image that EC2 pulls.

**EC2** — provide a simple, low-cost runtime for this application.

**BUILD_NUMBER tags** — every deployment points to one Jenkins build rather than a moving `latest` tag.

**Docker Compose** — keep the EC2 runtime configuration, image tag, port mapping, TLS mounts and environment settings together.

**Host-managed TLS** — Let’s Encrypt files remain on EC2 and are mounted into the container read-only instead of being baked into the image.

### Deployment trace

```text
Jenkins #107
    ↓
neehar/felicity:107
    ↓
Docker Hub
    ↓
docker-compose.yml
    ↓
EC2 container
    ↓
HTTPS / health check
```

The live simulation also shows the exact configuration change:

```diff
- image: neehar/felicity:latest
+ image: neehar/felicity:107
```

### Jenkins pipeline

A representative Jenkinsfile for this workflow is included at `examples/collegefest/Jenkinsfile`. It models:

```text
Checkout → Build → Push → Update Compose on EC2 → Verify HTTPS
```

The example uses Jenkins-managed credential IDs for Docker Hub and the EC2 SSH key rather than embedding secrets. Because the original private Jenkinsfile is not exposed, this file is a **representative reconstruction of the deployment flow**, not a claim that these exact credential IDs or host paths were used.

### TLS certificate flow

```text
EC2 /etc/letsencrypt
        ↓  read-only volume mount
Docker Compose
        ↓
Flask container /443
```

The certificate files stay on EC2 and are mounted read-only into the container.

### Failure path

The sandbox can simulate an HTTPS health-check failure. The deployment is shown as **halted at verification**; it does not invent an automatic rollback that was not part of the described implementation.

---

# Neehara.dev — Interactive Cloud / DevOps Sandbox

This is the React + TypeScript foundation for the interactive portfolio concept, with dedicated labs for Progressive Delivery and AWS architecture reasoning.

## Café AWS Architecture Lab

Route: `/sandbox/cafe-aws`

The Café project is presented as an architecture evolution rather than a flat list of services:

```text
1. Static website
   S3
      ↓
2. Dynamic application
   EC2 + VPC
      ↓
3. Managed database
   RDS in private subnet
      ↓
4. High availability
   ALB (public subnets) → EC2 Auto Scaling (private app subnets)
      ↓
5. Secure reporting
   EventBridge → Lambda 1 → Lambda 2 → SNS → stakeholder email
                     │
                     └─ optional later: SQS for buffering / retries / DLQ
      ↓
6. Repeatable infrastructure
   CloudFormation → deploy the same stack in another Region
```

CloudWatch remains an operational plane across the system, while CloudFormation is the infrastructure-as-code overlay that defines the stack.

### Stage 1 — S3 static site

The initial requirement is simply to advertise the café. A static site does not need an always-on application server, so the simulation explains why S3 is an appropriate low-complexity starting point.

### Stage 2 — dynamic EC2 application

Online ordering introduces server-side application behavior. The simulation shows a simple EC2-based web tier while keeping the relational database isolated in a private subnet.

### Stage 3 — RDS managed data

As operational burden grows, the database moves to Amazon RDS. The design reasoning focuses on reducing routine database administration while keeping the data tier private.

### Stage 4 — ALB + Auto Scaling

A single EC2 instance becomes a bottleneck and a single failure domain. The evolved design uses a public Application Load Balancer and an Auto Scaling group of web instances.

### Stage 5 — two-stage reporting

Daily manual extraction is replaced by a least-privilege reporting workflow:

```text
EventBridge
    ↓
Lambda 1
├── DB read permission
├── Secrets Manager access
├── process / aggregate data
└── invoke Lambda 2
    ↓
Lambda 2
├── no DB permission
└── SNS Publish
    ↓
Stakeholders
```

SQS is **not required** for this baseline daily report. It can be introduced later when the reporting path needs durable buffering, independent retries or a dead-letter queue.

### Stage 6 — CloudFormation / infrastructure as code

As the system matures, rebuilding the same VPC, subnets, security controls, load balancer, compute and database manually in another Region becomes slow and error-prone. The project therefore introduces CloudFormation as IaC:

```text
CloudFormation template
        │
        ├──── parameters for Region A ──→ Stack A
        │                                   VPC / ALB / ASG / RDS
        │
        └──── parameters for Region B ──→ Stack B
                                            VPC / ALB / ASG / RDS
```

The important distinction is that **CloudFormation reproduces infrastructure definitions; it does not replicate application data or database state**. Those concerns require their own regional design.

### Interactive design-thinking questions

The Café lab intentionally asks the visitor:

- Why S3 instead of EC2 at the beginning?
- Why is the database private?
- Why RDS instead of self-managed MySQL?
- Why ALB + Auto Scaling instead of a bigger EC2 instance?
- Why split the reporting workflow into two Lambdas?
- Do we actually need SQS between the functions?
- How does CloudFormation help reproduce this architecture in another Region?
- What would you deliberately **not** add yet, and why?

The project therefore demonstrates architecture trade-offs, security boundaries, operational reasoning, and infrastructure-as-code thinking instead of simply naming AWS services.

## Important limitation

This is a **frontend simulation**. It does not create or connect to live AWS resources, billing accounts or customer traffic. The CloudFormation stage is a visualization of repeatable infrastructure deployment; it does not create a multi-Region deployment from the browser.

## Image Gallery Sandbox (v0.4.5)

Route: `/sandbox/image-gallery`

This lab turns the real Image Gallery project into an architecture-evolution experience:

1. S3 static website + a small image set
2. generated image IDs / metadata JSON index
3. Lambda + API Gateway dynamic listing from S3
4. private S3 delivered through CloudFront + OAC

Live deployment: https://dj209obmn76yt.cloudfront.net/
Repository: https://github.com/neehar2601/image_gallery
Medium: https://medium.com/@ngn22666


## v0.4.5 live traffic map

The Image Gallery sandbox now renders the architecture as a live runtime map with continuously moving request/data packets. Stage 4 shows the two runtime paths separately: Browser → CloudFront → private S3 for site/image delivery, and Browser → API Gateway → Lambda → S3 for dynamic metadata discovery.


## v0.4.5 runtime-flow correction

Stage 4 is represented as two independent runtime paths that meet in the browser:

- Page and image delivery: Browser → CloudFront → private S3 (OAC)
- Dynamic metadata: Browser → API Gateway → Lambda → S3 object listing

The browser first loads the static page/script through CloudFront; the JavaScript then calls the API to retrieve the current object list. Images referenced by the response are requested through CloudFront.


## v0.4.5 design-reasoning additions

The Image Gallery sandbox now includes a clear **Why did the architecture change?** timeline. Each stage is presented as:

```text
Problem → Change → Result
```

This makes the architecture evolution explicit instead of presenting the four states as a list of AWS services.

### Future consideration — signed uploads

A planned next step is a secure upload workflow using a short-lived S3 presigned URL generated through Lambda:

```text
Browser
   ↓
API Gateway
   ↓
Lambda
   ↓
presigned S3 PUT URL
   ↓
Private S3
```

The browser never receives long-lived AWS credentials and the S3 bucket does not need to be made directly writable from the client. This is presented as **future architecture**, not an implemented feature.

Other future considerations include image transformations and application-level access control for private galleries.

## v0.4.5 merged reasoning section
The separate “ask why” and “requirement changed” sections are now one interactive architecture-reasoning timeline. Each stage shows Problem → Change → Result, with a selected detail panel for Decision → Trade-off and technologies.

### CollegeFest version history

- **v0.5.4:** moved to immutable `BUILD_NUMBER` image tags and added the large EC2 runtime boundary.
- **v0.5.5:** simplified the story around the concrete deployment flow.
- **v0.5.7:** added architecture reasoning, deployment trace, `latest → BUILD_NUMBER` diff, TLS flow, and a representative Jenkinsfile.
