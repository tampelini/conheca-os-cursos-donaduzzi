/*
 * Sugestões para o campo "Nome completo" do totem.
 *
 * A lista é fixa e embutida no app (funciona offline): nomes e sobrenomes comuns no
 * Brasil, com alguns sobrenomes de origem alemã e italiana frequentes no oeste do
 * Paraná. As sugestões NUNCA vêm de participantes anteriores, para que os dados de
 * uma pessoa não apareçam para a próxima. Cada lista está em ordem aproximada de
 * frequência: os primeiros itens são sugeridos primeiro.
 */

export const FIRST_NAMES: readonly string[] = [
  'Maria', 'José', 'Ana', 'João', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Gabriel', 'Rafael', 'Francisca',
  'Daniel', 'Marcelo', 'Bruno', 'Eduardo', 'Felipe', 'Rodrigo', 'Antônia', 'Adriana', 'Juliana', 'Márcia', 'Fernanda', 'Patrícia', 'Aline', 'Sandra',
  'Camila', 'Amanda', 'Bruna', 'Jéssica', 'Letícia', 'Júlia', 'Luciana', 'Vanessa', 'Mariana', 'Gabriela', 'Mateus', 'André', 'Fernando', 'Fábio',
  'Leonardo', 'Gustavo', 'Guilherme', 'Leandro', 'Tiago', 'Anderson', 'Ricardo', 'Márcio', 'Jorge', 'Alexandre', 'Roberto', 'Edson', 'Diego', 'Vítor',
  'Sérgio', 'Cláudio', 'Matheus', 'Thiago', 'Adriano', 'Luciano', 'Júlio', 'Renato', 'Vinícius', 'Rogério', 'Samuel', 'Vera', 'Vitória', 'Larissa',
  'Cláudia', 'Beatriz', 'Rita', 'Luana', 'Sônia', 'Renata', 'Eliane', 'Simone', 'Natália', 'Cristiane', 'Carla', 'Débora', 'Rosângela', 'Jaqueline',
  'Rosa', 'Daniela', 'Aparecida', 'Marlene', 'Terezinha', 'Andreia', 'Fabiana', 'Lúcia', 'Raquel', 'Ângela', 'Rafaela', 'Joana', 'Luzia', 'Elaine',
  'Daniele', 'Regina', 'Daiane', 'Sueli', 'Alessandra', 'Isabel', 'Bianca', 'Sara', 'Viviane', 'Carolina', 'Tatiane', 'Helena', 'Priscila', 'Mônica',
  'Tânia', 'Michele', 'Cristina', 'Silvana', 'Lorena', 'Paula', 'Alice', 'Laura', 'Isabela', 'Isadora', 'Sofia', 'Valentina', 'Heloísa', 'Lívia',
  'Manuela', 'Cecília', 'Eduarda', 'Giovana', 'Yasmin', 'Lara', 'Milena', 'Kelly', 'Thaís', 'Pâmela', 'Rebeca', 'Elisângela', 'Edna', 'Neusa', 'Ivone',
  'Marta', 'Rosana', 'Solange', 'Sabrina', 'Karina', 'Lidiane', 'Franciele', 'Gisele', 'Roseli', 'Ivete', 'Marli', 'Noemi', 'Clarice', 'Nicole',
  'Melissa', 'Emanuele', 'Josefa', 'Raimunda', 'Raimundo', 'Manoel', 'Sebastião', 'Geraldo', 'Alex', 'Ronaldo', 'Mário', 'Flávio', 'Igor', 'Douglas',
  'Davi', 'Manuel', 'Jeferson', 'Cícero', 'Victor', 'Miguel', 'Robson', 'Maurício', 'Sandro', 'Henrique', 'Wesley', 'Caio', 'Arthur', 'Heitor',
  'Bernardo', 'Enzo', 'Lorenzo', 'Théo', 'Murilo', 'Otávio', 'Emanuel', 'Nicolas', 'Benjamin', 'Joaquim', 'Vicente', 'Augusto', 'César', 'Cristiano',
  'Danilo', 'Diogo', 'Elias', 'Everton', 'Fabrício', 'Gilberto', 'Hugo', 'Ivan', 'Jair', 'Jonas', 'Josué', 'Juliano', 'Kauã', 'Nelson', 'Osvaldo',
  'Patrick', 'Renan', 'Reinaldo', 'Rubens', 'Sílvio', 'Valdir', 'Wagner', 'Wellington', 'William', 'Wilson', 'Yuri', 'Alan', 'Breno', 'Erick',
  'Ezequiel', 'Isaac', 'Israel', 'Jean', 'Jonathan', 'Michel', 'Natan', 'Pablo', 'Ruan', 'Saulo', 'Valter', 'Ademir', 'Adilson', 'Airton', 'Celso',
  'Darci', 'Dirceu', 'Ivo', 'Lauro', 'Nilson', 'Odair', 'Olavo', 'Volnei', 'Luís', 'Luísa', 'Lurdes', 'Leila', 'Lilian', 'Kátia', 'Íris', 'Inês',
  'Graziela', 'Glória', 'Flávia', 'Fátima', 'Eva', 'Ester', 'Elza', 'Denise', 'Dalva', 'Cíntia', 'Célia', 'Benedita', 'Benedito', 'Bárbara', 'Zélia',
  'Zilda', 'Xavier', 'Úrsula', 'Quitéria', 'Queila', 'Hélio', 'Humberto', 'Horácio', 'Ulisses', 'Tomás', 'Tereza', 'Teresa', 'Túlio', 'Olga', 'Olívia',
  'Orlando', 'Oscar', 'Nádia', 'Nair', 'Natasha', 'Gilson', 'Gerson', 'Giovani', 'Evandro', 'Emerson', 'Édson', 'Elton', 'Dener', 'Denis', 'Dionísio',
];

export const SURNAMES: readonly string[] = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado',
  'Mendes', 'Freitas', 'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira', 'Araújo', 'Monteiro', 'Moura', 'Batista', 'Campos', 'Borges', 'Melo',
  'Pinto', 'Reis', 'Correia', 'Castro', 'Farias', 'Miranda', 'Azevedo', 'Barros', 'Cunha', 'Duarte', 'Moraes', 'Medeiros', 'Nogueira', 'Pires',
  'Sales', 'Siqueira', 'Tavares', 'Xavier', 'Bezerra', 'Brito', 'Cruz', 'Coelho', 'Guimarães', 'Macedo', 'Matos', 'Peixoto', 'Queiroz', 'Rezende',
  'Sampaio', 'Vasconcelos', 'Viana', 'Leite', 'Fonseca', 'Figueiredo', 'Paiva', 'Pacheco', 'Antunes', 'Aguiar', 'Amaral', 'Assis', 'Bueno', 'Camargo',
  'Cavalcanti', 'Domingues', 'Esteves', 'Franco', 'Garcia', 'Lacerda', 'Leal', 'Maia', 'Menezes', 'Neves', 'Prado', 'Rangel', 'Schmidt', 'Schneider',
  'Müller', 'Weber', 'Becker', 'Hoffmann', 'Wagner', 'Klein', 'Zimmermann', 'Schmitt', 'Kuhn', 'Welter', 'Hahn', 'Vogel', 'Scherer', 'Lang', 'Rossi',
  'Bianchi', 'Ferrari', 'Zanella', 'Sartori', 'Bertoldi', 'Tonin', 'Bonatto', 'Dalmolin', 'Pasqualotto', 'Fabris', 'Lorenzetti', 'Marchi', 'Trevisan',
  'Zanatta', 'Vargas', 'Ortiz', 'Ximenes', 'Valente', 'Ventura', 'Uchoa', 'Toledo', 'Torres', 'Simões', 'Serra', 'Rosa', 'Rios', 'Quadros', 'Paz',
  'Padilha', 'Ortega', 'Novaes', 'Nery', 'Luz', 'Lemos', 'Kaiser', 'Krause', 'Jesus', 'Jardim', 'Ivo', 'Inácio', 'Hermes', 'Godoy', 'Gouveia',
  'Flores', 'Fagundes', 'Evangelista', 'Estrela', 'Dantas', 'Diniz', 'Chaves', 'Cordeiro', 'Bastos', 'Brandão', 'Yamamoto', 'Yoshida', 'Zago',
];

/** Partículas de sobrenome, sugeridas só a partir da segunda palavra. */
const PARTICLES: readonly string[] = ['da', 'de', 'dos', 'do', 'das'];
/** No máximo este tanto de partículas por vez, para sobrar lugar para sobrenomes. */
const MAX_PARTICLES = 3;

/** Sem acento e em minúsculas, para a pessoa não precisar digitar acentos. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Sugestões para a palavra que está sendo digitada (a última do campo).
 * - 1ª palavra: nomes.
 * - Demais palavras: partículas (da, de, dos) e sobrenomes primeiro, depois nomes (nomes compostos).
 * - Logo após um espaço, sugere os sobrenomes mais comuns.
 */
export function suggestNames(value: string, limit = 6): string[] {
  const text = value.replace(/^\s+/, '');
  if (!text) return [];
  const parts = text.split(/\s+/);
  const current = parts[parts.length - 1];
  const done = parts.slice(0, -1);
  const first = done.length === 0;
  const prefix = fold(current);
  if (first && !prefix) return [];

  // "da Silva", "dos Santos": ao digitar "d", as partículas vêm antes dos sobrenomes.
  const pool = first ? FIRST_NAMES : [...PARTICLES, ...SURNAMES, ...FIRST_NAMES];
  let particles = 0;
  const used = new Set(done.map(fold));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of pool) {
    const key = fold(name);
    // Não repete palavra já escrita (exceto partículas) nem sugere o que já está completo.
    if (seen.has(key) || (used.has(key) && !PARTICLES.includes(name))) continue;
    if (prefix && (!key.startsWith(prefix) || (key === prefix && name === current))) continue;
    if (PARTICLES.includes(name) && (!prefix || ++particles > MAX_PARTICLES)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/** Troca a palavra em digitação pela sugestão e deixa um espaço para a próxima. */
export function applySuggestion(value: string, suggestion: string): string {
  const text = value.replace(/^\s+/, '');
  const cut = text.search(/\S+$/);
  const head = cut === -1 ? text : text.slice(0, cut);
  return `${head}${suggestion} `;
}
