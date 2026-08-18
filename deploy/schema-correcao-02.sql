-- Correção 2: a coluna "removida" era NOT NULL, mas linhas antigas de aulas.json
-- nem sempre tinham esse campo preenchido (equivalia a "não removida"). O sistema
-- já trata ausência/NULL como falso em qualquer comparação, então só precisa
-- deixar de exigir NOT NULL — o valor padrão (false) continua valendo para
-- linhas novas que não informarem nada.
alter table aulas alter column removida drop not null;
