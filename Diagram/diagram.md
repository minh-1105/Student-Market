# Architecture Diagram Agent Rules

## Skills

- Use `code-to-diagram` to inspect source code and extract architecture facts.
- Use `drawio` to create professional editable diagrams.
- Prefer official AWS architecture icons for AWS infrastructure diagrams.

## Workflow

1. Analyze the project structure and configuration.
2. Identify modules, services, APIs, databases, dependencies, and communication flows.
3. Verify relationships against source code.
4. Generate Mermaid specifications.
5. Build the initial `.drawio` using code-to-diagram.
6. Validate the generated diagram.
7. Use draw.io capabilities to improve styling when needed.
8. Export the final architecture diagram.

## Rules

- Never invent components or dependencies.
- Distinguish implemented infrastructure from proposed architecture.
- Label connections and protocols when verified.
- Avoid overlapping nodes and crossed edges.
- Group AWS resources by Region, VPC, Availability Zone and Subnet where appropriate.
- Preserve an editable `.drawio` file.
- Keep the original Mermaid specification for regeneration.

## Output

Save files under `diagram/architecture/`:

- `architecture.mmd`
- `architecture.drawio`
- `architecture.png`

## Validation

- Verify all components against the source.
- Check node and edge connections.
- Check layout readability.
- Report unsupported or inferred relationships.
