#!/usr/bin/env node

/**
 * TypeScript API Documentation Generator
 * 自动从TypeScript源码生成API文档
 */

import * as ts from 'typescript'
import * as fs from 'fs/promises'
import * as path from 'path'
import { glob } from 'glob'

interface APIDocConfig {
  srcDir: string
  outputDir: string
  exclude: string[]
  includePrivate: boolean
  includeInternal: boolean
  format: 'markdown' | 'json' | 'html'
  groupBy: 'file' | 'module' | 'category'
}

interface ComponentDoc {
  name: string
  description: string
  props: PropDoc[]
  methods: MethodDoc[]
  events: EventDoc[]
  examples: ExampleDoc[]
  category: string
  tags: string[]
  filePath: string
}

interface PropDoc {
  name: string
  type: string
  description: string
  required: boolean
  defaultValue?: string
  examples?: string[]
}

interface MethodDoc {
  name: string
  description: string
  parameters: ParameterDoc[]
  returnType: string
  examples?: string[]
}

interface EventDoc {
  name: string
  description: string
  payload: string
  examples?: string[]
}

interface ExampleDoc {
  title: string
  code: string
  description?: string
}

interface ParameterDoc {
  name: string
  type: string
  description: string
  optional: boolean
}

class TypeScriptAPIGenerator {
  private program: ts.Program
  private checker: ts.TypeChecker
  private config: APIDocConfig

  constructor(config: APIDocConfig) {
    this.config = config
    this.initializeTypeScript()
  }

  private initializeTypeScript() {
    const tsConfigPath = path.resolve(process.cwd(), 'tsconfig.json')
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
    
    if (configFile.error) {
      throw new Error(`Error reading tsconfig.json: ${configFile.error.messageText}`)
    }

    const compilerOptions = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(tsConfigPath)
    )

    if (compilerOptions.errors.length > 0) {
      throw new Error(`Error parsing tsconfig.json: ${compilerOptions.errors.map(e => e.messageText).join(', ')}`)
    }

    // 获取所有TypeScript文件
    const files = glob.sync(`${this.config.srcDir}/**/*.{ts,tsx}`, {
      ignore: this.config.exclude
    })

    this.program = ts.createProgram(files, compilerOptions.options)
    this.checker = this.program.getTypeChecker()
  }

  async generateDocs(): Promise<ComponentDoc[]> {
    const sourceFiles = this.program.getSourceFiles()
      .filter(file => file.fileName.includes(this.config.srcDir))

    const componentDocs: ComponentDoc[] = []

    for (const sourceFile of sourceFiles) {
      const docs = this.processSourceFile(sourceFile)
      componentDocs.push(...docs)
    }

    await this.writeDocumentation(componentDocs)
    return componentDocs
  }

  private processSourceFile(sourceFile: ts.SourceFile): ComponentDoc[] {
    const componentDocs: ComponentDoc[] = []

    const visit = (node: ts.Node) => {
      // 处理React组件
      if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
        const componentDoc = this.processComponent(node, sourceFile)
        if (componentDoc) {
          componentDocs.push(componentDoc)
        }
      }

      // 处理接口定义
      if (ts.isInterfaceDeclaration(node)) {
        const interfaceDoc = this.processInterface(node, sourceFile)
        if (interfaceDoc) {
          componentDocs.push(interfaceDoc)
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return componentDocs
  }

  private processComponent(node: ts.Node, sourceFile: ts.SourceFile): ComponentDoc | null {
    const symbol = this.checker.getSymbolAtLocation(node)
    if (!symbol) return null

    const name = symbol.getName()
    
    // 检查是否为React组件
    if (!this.isReactComponent(node)) return null

    const description = this.getJSDocDescription(symbol)
    const tags = this.getJSDocTags(symbol)
    const category = this.getCategory(tags, sourceFile.fileName)

    // 获取Props类型
    const propsType = this.getPropsType(node)
    const props = propsType ? this.getPropsDocumentation(propsType) : []

    // 获取方法和事件
    const methods = this.getComponentMethods(node)
    const events = this.getComponentEvents(node, tags)

    // 获取示例代码
    const examples = this.getExamples(tags)

    return {
      name,
      description,
      props,
      methods,
      events,
      examples,
      category,
      tags: tags.map(tag => tag.name),
      filePath: sourceFile.fileName
    }
  }

  private processInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ComponentDoc | null {
    const symbol = this.checker.getSymbolAtLocation(node.name)
    if (!symbol) return null

    const name = symbol.getName()
    const description = this.getJSDocDescription(symbol)
    const tags = this.getJSDocTags(symbol)
    const category = this.getCategory(tags, sourceFile.fileName)

    // 处理接口属性
    const props = node.members
      .filter(ts.isPropertySignature)
      .map(member => this.processInterfaceProperty(member))
      .filter(Boolean) as PropDoc[]

    return {
      name,
      description,
      props,
      methods: [],
      events: [],
      examples: this.getExamples(tags),
      category,
      tags: tags.map(tag => tag.name),
      filePath: sourceFile.fileName
    }
  }

  private isReactComponent(node: ts.Node): boolean {
    // 检查函数组件
    if (ts.isFunctionDeclaration(node)) {
      const returnType = this.checker.getReturnTypeOfSignature(
        this.checker.getSignatureFromDeclaration(node)!
      )
      return this.isReactElementType(returnType)
    }

    // 检查变量组件
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0]
      if (declaration && ts.isVariableDeclaration(declaration)) {
        const type = this.checker.getTypeAtLocation(declaration)
        return this.isReactComponentType(type)
      }
    }

    return false
  }

  private isReactElementType(type: ts.Type): boolean {
    const typeString = this.checker.typeToString(type)
    return /JSX\.Element|ReactElement|ReactNode/.test(typeString)
  }

  private isReactComponentType(type: ts.Type): boolean {
    const typeString = this.checker.typeToString(type)
    return /React\.FC|React\.FunctionComponent|ComponentType/.test(typeString)
  }

  private getPropsType(node: ts.Node): ts.Type | null {
    if (ts.isFunctionDeclaration(node)) {
      const parameters = node.parameters
      if (parameters.length > 0) {
        return this.checker.getTypeAtLocation(parameters[0])
      }
    }
    return null
  }

  private getPropsDocumentation(propsType: ts.Type): PropDoc[] {
    const props: PropDoc[] = []
    
    propsType.getProperties().forEach(prop => {
      const propType = this.checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!)
      const propDoc: PropDoc = {
        name: prop.getName(),
        type: this.checker.typeToString(propType),
        description: this.getJSDocDescription(prop),
        required: !this.isOptionalProperty(prop),
        defaultValue: this.getDefaultValue(prop)
      }
      
      props.push(propDoc)
    })

    return props
  }

  private processInterfaceProperty(member: ts.PropertySignature): PropDoc | null {
    if (!member.name) return null

    const symbol = this.checker.getSymbolAtLocation(member.name)
    if (!symbol) return null

    const type = this.checker.getTypeAtLocation(member)
    
    return {
      name: symbol.getName(),
      type: this.checker.typeToString(type),
      description: this.getJSDocDescription(symbol),
      required: !member.questionToken,
      defaultValue: this.getDefaultValueFromType(type)
    }
  }

  private getComponentMethods(node: ts.Node): MethodDoc[] {
    // 这里可以扩展以获取组件方法
    return []
  }

  private getComponentEvents(node: ts.Node, tags: ts.JSDocTagInfo[]): EventDoc[] {
    const events: EventDoc[] = []
    
    // 从JSDoc标签中提取事件信息
    tags.forEach(tag => {
      if (tag.name === 'event') {
        const eventDoc = this.parseEventTag(tag)
        if (eventDoc) {
          events.push(eventDoc)
        }
      }
    })

    return events
  }

  private parseEventTag(tag: ts.JSDocTagInfo): EventDoc | null {
    if (!tag.text) return null

    const text = tag.text.map(t => t.text).join('')
    const match = text.match(/^(\w+)\s*-\s*(.+)$/)
    
    if (match) {
      return {
        name: match[1],
        description: match[2],
        payload: 'Event',
        examples: []
      }
    }

    return null
  }

  private getJSDocDescription(symbol: ts.Symbol): string {
    const documentation = symbol.getDocumentationComment(this.checker)
    return documentation.map(doc => doc.text).join('\n')
  }

  private getJSDocTags(symbol: ts.Symbol): ts.JSDocTagInfo[] {
    return symbol.getJsDocTags()
  }

  private getCategory(tags: ts.JSDocTagInfo[], filePath: string): string {
    // 从标签中获取分类
    const categoryTag = tags.find(tag => tag.name === 'category')
    if (categoryTag && categoryTag.text) {
      return categoryTag.text.map(t => t.text).join('')
    }

    // 从文件路径推断分类
    if (filePath.includes('/components/')) {
      if (filePath.includes('/basic/')) return 'Basic'
      if (filePath.includes('/layout/')) return 'Layout'
      if (filePath.includes('/interactive/')) return 'Interactive'
      if (filePath.includes('/advanced/')) return 'Advanced'
    }

    return 'General'
  }

  private getExamples(tags: ts.JSDocTagInfo[]): ExampleDoc[] {
    const examples: ExampleDoc[] = []
    
    tags.forEach(tag => {
      if (tag.name === 'example') {
        const exampleDoc = this.parseExampleTag(tag)
        if (exampleDoc) {
          examples.push(exampleDoc)
        }
      }
    })

    return examples
  }

  private parseExampleTag(tag: ts.JSDocTagInfo): ExampleDoc | null {
    if (!tag.text) return null

    const text = tag.text.map(t => t.text).join('')
    const lines = text.split('\n')
    
    const title = lines[0] || 'Example'
    const code = lines.slice(1).join('\n')

    return {
      title,
      code,
      description: ''
    }
  }

  private isOptionalProperty(symbol: ts.Symbol): boolean {
    return (symbol.flags & ts.SymbolFlags.Optional) !== 0
  }

  private getDefaultValue(symbol: ts.Symbol): string | undefined {
    // 尝试从JSDoc标签获取默认值
    const tags = symbol.getJsDocTags()
    const defaultTag = tags.find(tag => tag.name === 'default')
    
    if (defaultTag && defaultTag.text) {
      return defaultTag.text.map(t => t.text).join('')
    }

    return undefined
  }

  private getDefaultValueFromType(type: ts.Type): string | undefined {
    // 从类型定义中推断默认值
    const typeString = this.checker.typeToString(type)
    
    if (typeString === 'true' || typeString === 'false') {
      return typeString
    }
    
    if (typeString.includes('undefined')) {
      return 'undefined'
    }

    return undefined
  }

  private async writeDocumentation(componentDocs: ComponentDoc[]): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true })

    switch (this.config.format) {
      case 'markdown':
        await this.writeMarkdownDocs(componentDocs)
        break
      case 'json':
        await this.writeJSONDocs(componentDocs)
        break
      case 'html':
        await this.writeHTMLDocs(componentDocs)
        break
    }
  }

  private async writeMarkdownDocs(componentDocs: ComponentDoc[]): Promise<void> {
    // 按分类分组
    const groupedDocs = this.groupDocuments(componentDocs)

    for (const [category, docs] of Object.entries(groupedDocs)) {
      const categoryDir = path.join(this.config.outputDir, category.toLowerCase())
      await fs.mkdir(categoryDir, { recursive: true })

      for (const doc of docs) {
        const markdown = this.generateMarkdown(doc)
        const filename = `${doc.name.toLowerCase()}.md`
        await fs.writeFile(path.join(categoryDir, filename), markdown)
      }

      // 生成分类索引
      const indexMarkdown = this.generateCategoryIndex(category, docs)
      await fs.writeFile(path.join(categoryDir, 'index.md'), indexMarkdown)
    }

    // 生成总索引
    const mainIndexMarkdown = this.generateMainIndex(groupedDocs)
    await fs.writeFile(path.join(this.config.outputDir, 'index.md'), mainIndexMarkdown)
  }

  private groupDocuments(componentDocs: ComponentDoc[]): Record<string, ComponentDoc[]> {
    return componentDocs.reduce((groups, doc) => {
      const category = doc.category || 'General'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(doc)
      return groups
    }, {} as Record<string, ComponentDoc[]>)
  }

  private generateMarkdown(doc: ComponentDoc): string {
    const sections: string[] = []

    // 标题和描述
    sections.push(`# ${doc.name}`)
    sections.push('')
    sections.push(doc.description || `${doc.name} component`)
    sections.push('')

    // 标签
    if (doc.tags.length > 0) {
      sections.push(`**Tags:** ${doc.tags.map(tag => `\`${tag}\``).join(', ')}`)
      sections.push('')
    }

    // Props API
    if (doc.props.length > 0) {
      sections.push('## Props')
      sections.push('')
      sections.push('| Name | Type | Required | Default | Description |')
      sections.push('|------|------|----------|---------|-------------|')
      
      doc.props.forEach(prop => {
        const required = prop.required ? '✅' : '❌'
        const defaultValue = prop.defaultValue || '-'
        sections.push(`| ${prop.name} | \`${prop.type}\` | ${required} | \`${defaultValue}\` | ${prop.description} |`)
      })
      sections.push('')
    }

    // Methods API
    if (doc.methods.length > 0) {
      sections.push('## Methods')
      sections.push('')
      
      doc.methods.forEach(method => {
        sections.push(`### ${method.name}`)
        sections.push('')
        sections.push(method.description || `${method.name} method`)
        sections.push('')
        
        if (method.parameters.length > 0) {
          sections.push('**Parameters:**')
          sections.push('')
          method.parameters.forEach(param => {
            const optional = param.optional ? ' (optional)' : ''
            sections.push(`- \`${param.name}\` (${param.type}${optional}): ${param.description}`)
          })
          sections.push('')
        }
        
        sections.push(`**Returns:** \`${method.returnType}\``)
        sections.push('')
      })
    }

    // Events API
    if (doc.events.length > 0) {
      sections.push('## Events')
      sections.push('')
      sections.push('| Event | Payload | Description |')
      sections.push('|-------|---------|-------------|')
      
      doc.events.forEach(event => {
        sections.push(`| ${event.name} | \`${event.payload}\` | ${event.description} |`)
      })
      sections.push('')
    }

    // Examples
    if (doc.examples.length > 0) {
      sections.push('## Examples')
      sections.push('')
      
      doc.examples.forEach((example, index) => {
        sections.push(`### ${example.title}`)
        sections.push('')
        if (example.description) {
          sections.push(example.description)
          sections.push('')
        }
        sections.push('```tsx')
        sections.push(example.code)
        sections.push('```')
        sections.push('')
      })
    }

    return sections.join('\n')
  }

  private generateCategoryIndex(category: string, docs: ComponentDoc[]): string {
    const sections: string[] = []

    sections.push(`# ${category} Components`)
    sections.push('')
    sections.push(`This category contains ${docs.length} component${docs.length > 1 ? 's' : ''}:`)
    sections.push('')

    docs.forEach(doc => {
      sections.push(`## [${doc.name}](./${doc.name.toLowerCase()})`)
      sections.push('')
      sections.push(doc.description || `${doc.name} component`)
      sections.push('')
      
      if (doc.props.length > 0) {
        sections.push(`**Props:** ${doc.props.length} properties`)
      }
      if (doc.methods.length > 0) {
        sections.push(`**Methods:** ${doc.methods.length} methods`)
      }
      if (doc.events.length > 0) {
        sections.push(`**Events:** ${doc.events.length} events`)
      }
      sections.push('')
    })

    return sections.join('\n')
  }

  private generateMainIndex(groupedDocs: Record<string, ComponentDoc[]>): string {
    const sections: string[] = []

    sections.push('# API Documentation')
    sections.push('')
    sections.push('Auto-generated API documentation for Mobile IM Components.')
    sections.push('')

    const totalComponents = Object.values(groupedDocs).flat().length
    sections.push(`**Total Components:** ${totalComponents}`)
    sections.push('')

    Object.entries(groupedDocs).forEach(([category, docs]) => {
      sections.push(`## [${category}](./${category.toLowerCase()}/)`)
      sections.push('')
      sections.push(`${docs.length} component${docs.length > 1 ? 's' : ''}`)
      sections.push('')
      
      docs.slice(0, 5).forEach(doc => {
        sections.push(`- [${doc.name}](./${category.toLowerCase()}/${doc.name.toLowerCase()})`)
      })
      
      if (docs.length > 5) {
        sections.push(`- ... and ${docs.length - 5} more`)
      }
      sections.push('')
    })

    return sections.join('\n')
  }

  private async writeJSONDocs(componentDocs: ComponentDoc[]): Promise<void> {
    const jsonData = {
      generated: new Date().toISOString(),
      components: componentDocs,
      stats: {
        total: componentDocs.length,
        byCategory: this.getStatsByCategory(componentDocs)
      }
    }

    await fs.writeFile(
      path.join(this.config.outputDir, 'api-docs.json'),
      JSON.stringify(jsonData, null, 2)
    )
  }

  private async writeHTMLDocs(componentDocs: ComponentDoc[]): Promise<void> {
    // HTML格式的文档生成
    const html = this.generateHTML(componentDocs)
    await fs.writeFile(path.join(this.config.outputDir, 'api-docs.html'), html)
  }

  private generateHTML(componentDocs: ComponentDoc[]): string {
    // 简单的HTML模板
    return `
<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .component { margin-bottom: 40px; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
        .props-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .props-table th, .props-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    </style>
</head>
<body>
    <h1>API Documentation</h1>
    ${componentDocs.map(doc => this.generateComponentHTML(doc)).join('\n')}
</body>
</html>
    `
  }

  private generateComponentHTML(doc: ComponentDoc): string {
    return `
<div class="component">
    <h2>${doc.name}</h2>
    <p>${doc.description}</p>
    
    ${doc.props.length > 0 ? `
    <h3>Props</h3>
    <table class="props-table">
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
        ${doc.props.map(prop => `
        <tr>
            <td><code>${prop.name}</code></td>
            <td><code>${prop.type}</code></td>
            <td>${prop.required ? '✅' : '❌'}</td>
            <td><code>${prop.defaultValue || '-'}</code></td>
            <td>${prop.description}</td>
        </tr>
        `).join('')}
    </table>
    ` : ''}
</div>
    `
  }

  private getStatsByCategory(componentDocs: ComponentDoc[]): Record<string, number> {
    return componentDocs.reduce((stats, doc) => {
      const category = doc.category || 'General'
      stats[category] = (stats[category] || 0) + 1
      return stats
    }, {} as Record<string, number>)
  }
}

// CLI入口
async function main() {
  const config: APIDocConfig = {
    srcDir: path.resolve(process.cwd(), 'src'),
    outputDir: path.resolve(process.cwd(), 'docs/api/generated'),
    exclude: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.stories.*',
      '**/node_modules/**'
    ],
    includePrivate: false,
    includeInternal: false,
    format: 'markdown',
    groupBy: 'category'
  }

  try {
    console.log('🔍 Generating API documentation...')
    
    const generator = new TypeScriptAPIGenerator(config)
    const docs = await generator.generateDocs()
    
    console.log(`✅ Generated documentation for ${docs.length} components`)
    console.log(`📁 Output directory: ${config.outputDir}`)
    
    // 输出统计信息
    const stats = docs.reduce((acc, doc) => {
      const category = doc.category || 'General'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n📊 Components by category:')
    Object.entries(stats).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`)
    })
    
  } catch (error) {
    console.error('❌ Error generating API documentation:')
    console.error(error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

export { TypeScriptAPIGenerator, APIDocConfig, ComponentDoc }