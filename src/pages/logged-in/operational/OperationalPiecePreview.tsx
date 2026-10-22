import {
  Box,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  FileText,
  Gift,
  Package,
  Shirt,
  UserRound,
  UsersRound,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import styles from "./OperationalPiecePreview.module.css";

export type OperationalPiecePreviewKey =
  | "volunteers"
  | "projects"
  | "donations"
  | "calendar"
  | "board"
  | "dispatch"
  | "deliveries"
  | "availability"
  | "forms"
  | "inventory"
  | "events"
  | "assistance"
  | "partners"
  | "assets"
  | "messages"
  | "reservations";

interface OperationalPiecePreviewProps {
  name?: string | null;
  type?: string | null;
  previewKey?: OperationalPiecePreviewKey;
  className?: string;
}

const aliases: Record<OperationalPiecePreviewKey, string[]> = {
  volunteers: ["voluntarios", "volunteers", "volunteer"],
  projects: ["projetos", "projeto", "projects", "acoes", "actions"],
  donations: ["doacoes", "doacao", "donations", "donation"],
  calendar: ["agenda", "calendario", "calendar", "agenda operacional"],
  board: ["quadro", "kanban", "board", "quadro de operacoes"],
  dispatch: ["despacho", "dispatch", "central de despacho"],
  deliveries: ["entregas", "delivery", "delivery routes", "planejamento de entregas", "rotas"],
  availability: ["escala", "availability", "minha escala", "disponibilidade"],
  forms: ["formularios", "formulario", "forms", "form", "formularios conectados"],
  inventory: ["inventory","estoque"],
  events: ["events","eventos"],
  assistance: ["assistance","atendimentos"],
  partners: ["partners","parceiros"],
  assets: ["assets","patrimonio"],
  messages: ["messages","mensagens","conversas"],
  reservations: ["reservations","reservas","agendamento de recursos"],
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveOperationalPiecePreview(
  name?: string | null,
  type?: string | null,
): OperationalPiecePreviewKey | null {
  const inputs = [type, name].filter((value): value is string => Boolean(value)).map(normalize);
  for (const input of inputs) {
    for (const [key, values] of Object.entries(aliases) as [OperationalPiecePreviewKey, string[]][]) {
      if (values.some((value) => normalize(value) === input)) return key;
    }
  }
  for (const input of inputs) {
    for (const [key, values] of Object.entries(aliases) as [OperationalPiecePreviewKey, string[]][]) {
      if (values.some((value) => input.includes(normalize(value)))) return key;
    }
  }
  return null;
}

function PreviewVolunteers() {
  return (
    <div className={styles.people}>
      {[
        ["Cadastro", "Contatos", "a"],
        ["Equipe", "Funções", "b"],
        ["Participação", "Atividades", "c"],
      ].map(([name, subtitle, tone]) => (
        <div className={styles.person} key={name}>
          <span className={`${styles.avatar} ${styles[`tone${tone}`]}`}><UserRound size={14} /></span>
          <span className={styles.personCopy}><strong>{name}</strong><small>{subtitle}</small></span>
          <span className={`${styles.statusDot} ${styles[`tone${tone}`]}`} />
        </div>
      ))}
    </div>
  );
}

function PreviewProjects() {
  return (
    <div className={styles.projects}>
      {[
        ["Planejamento", "36%", "planning"],
        ["Execução", "74%", "running"],
        ["Conclusão", "100%", "completed"],
      ].map(([name, progress, variant]) => (
        <div className={styles.project} key={name}>
          <div className={styles.projectTop}><strong>{name}</strong><span className={`${styles.projectState} ${styles[variant]}`} /></div>
          <div className={styles.progress}><span style={{ width: progress }} /></div>
        </div>
      ))}
    </div>
  );
}

function PreviewDonations() {
  return (
    <div className={styles.donations}>
      {[
        ["Alimentos", "box"],
        ["Roupas", "shirt"],
        ["Outros itens", "gift"],
      ].map(([name, icon], index) => (
        <div className={styles.donation} key={name}>
          <span className={`${styles.itemIcon} ${styles[`item${index}`]}`}>
            {icon === "box" ? <Package size={14} /> : icon === "shirt" ? <Shirt size={14} /> : <Gift size={14} />}
          </span>
          <span className={styles.donationText}>{name}</span>
          <span className={styles.tinyTrack}><i /></span>
        </div>
      ))}
    </div>
  );
}

function PreviewCalendar() {
  return (
    <div className={styles.calendar}>
      <div className={styles.miniMonth}>
        <div className={styles.monthHeading}><CalendarDays size={12} /> Agenda</div>
        <div className={styles.weekDays}>{["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => <span key={index}>{day}</span>)}</div>
        <div className={styles.monthCells}>{Array.from({ length: 21 }, (_, i) => <span className={i === 10 ? styles.daySelected : i === 4 || i === 16 ? styles.dayMarked : ""} key={i}>{i + 1}</span>)}</div>
      </div>
      <div className={styles.agendaEvents}>
        {["Manhã", "Tarde", "Noite"].map((event, index) => (
          <div key={event}><span className={`${styles.eventLine} ${styles[`event${index}`]}`} /><span>{event}</span></div>
        ))}
      </div>
    </div>
  );
}

function PreviewBoard() {
  return (
    <div className={styles.board}>
      {[
        ["A fazer", "todo"],
        ["Em andamento", "doing"],
        ["Concluído", "done"],
      ].map(([title, variant], column) => (
        <div className={styles.boardColumn} key={title}>
          <span className={styles.boardTitle}>{title}</span>
          {Array.from({ length: column === 0 ? 3 : 2 }, (_, index) => (
            <span className={styles.boardTask} key={index}>
              <i className={styles[variant]} />
              <b />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PreviewDispatch() {
  return (
    <div className={styles.dispatch}>
      {["Aguardando", "Atribuído", "Em execução"].map((status, i) => (
        <div className={styles.dispatchRow} key={status}>
          <span className={`${styles.dispatchSymbol} ${styles[`dispatch${i}`]}`}><ClipboardList size={13} /></span>
          <span className={styles.dispatchLines}><b /><i /></span>
          <span className={`${styles.dispatchTag} ${styles[`dispatch${i}`]}`}>{status}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewDeliveries() {
  return (
    <div className={styles.deliveries}>
      <div className={styles.miniMap}>
        <svg viewBox="0 0 128 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path className={styles.street} d="M-12 19 139 72 M13-12 89 104 M-20 72 144 10 M38-8 24 107 M100-5 134 98" />
          <path className={styles.route} d="M20 75 53 47 84 59 113 19" />
          <circle cx="20" cy="75" r="6" className={styles.stop} />
          <circle cx="53" cy="47" r="6" className={styles.stop} />
          <circle cx="84" cy="59" r="6" className={styles.stop} />
          <circle cx="113" cy="19" r="6" className={styles.stop} />
        </svg>

      </div>
      <div className={styles.routeStops}>
        {[1, 2, 3].map((value) => (
          <div key={value}><span>{value}</span><b /><i /></div>
        ))}
      </div>
    </div>
  );
}

function PreviewAvailability() {
  return (
    <div className={styles.availability}>
      <div className={styles.availabilityHeader}>{["SEG", "TER", "QUA", "QUI", "SEX"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className={styles.availabilityGrid}>
        {Array.from({ length: 15 }, (_, index) => <span key={index} className={
          [0, 4, 7, 12].includes(index) ? styles.slotActive : [6, 8].includes(index) ? styles.slotSoft : ""
        } />)}
      </div>
    </div>
  );
}

function PreviewForms() {
  return (
    <div className={styles.forms}>
      <div className={styles.formFields}>
        <div><UserRound size={11} /><span>Nome</span></div>
        <div><FileText size={11} /><span>Identificação</span></div>
        <div><Clock3 size={11} /><span>Data</span></div>
      </div>
      <div className={styles.formConnectors}><span /><span /><span /></div>
      <div className={styles.formTargets}>
        <div><UsersRound size={11} /><span>Peça</span></div>
        <div><Box size={11} /><span>Dados</span></div>
        <div><Check size={11} /><span>Ação</span></div>
      </div>
    </div>
  );
}

function PreviewNewArea({type}:{type:"inventory"|"events"|"assistance"|"partners"|"assets"}){
  const templates={
    inventory:{icon:Package,items:["Materiais","Quantidades","Reposição"]},
    events:{icon:CalendarDays,items:["Programação","Participantes","Datas"]},
    assistance:{icon:ClipboardList,items:["Registros","Situação","Acompanhamento"]},
    partners:{icon:UsersRound,items:["Instituições","Contatos","Colaboração"]},
    assets:{icon:Box,items:["Equipamentos","Patrimônio","Manutenção"]},
  };
  const {icon:Icon,items}=templates[type];
  return <div className={styles.newArea}>{items.map((item,index)=><div className={styles.newAreaRow} key={item}><span className={styles.newAreaIcon}><Icon size={12}/></span><span className={styles.newAreaTitle}>{item}</span><span className={styles.newAreaBar} style={{width:`${24+index*8}%`}}/></div>)}</div>;
}

function PreviewGeneric() {
  return (
    <div className={styles.generic}>
      <div className={styles.genericHeader}><Box size={15} /><b /></div>
      <div className={styles.genericRows}><span /><span /><span /></div>
    </div>
  );
}

const names: Record<OperationalPiecePreviewKey, string> = {
  volunteers: "Voluntários",
  projects: "Projetos e ações",
  donations: "Doações",
  calendar: "Agenda operacional",
  board: "Quadro de operações",
  dispatch: "Central de despacho",
  deliveries: "Planejamento de entregas",
  availability: "Minha escala",
  forms: "Formulários conectados",
  inventory: "Estoque",
  events: "Eventos",
  assistance: "Atendimentos",
  partners: "Parceiros",
  assets: "Patrimônio",
  messages: "Mensagens",
  reservations: "Reservas",
};

export default function OperationalPiecePreview({ name, type, previewKey, className }: OperationalPiecePreviewProps) {
  const key = previewKey ?? resolveOperationalPiecePreview(name, type);
  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")} role="img" aria-label={`Prévia ilustrativa de ${key ? names[key] : name || "módulo"}; não representa dados reais`}>
      <div aria-hidden="true" className={styles.canvas}>
        {key === "volunteers" && <PreviewVolunteers />}
        {key === "projects" && <PreviewProjects />}
        {key === "donations" && <PreviewDonations />}
        {key === "calendar" && <PreviewCalendar />}
        {key === "board" && <PreviewBoard />}
        {key === "dispatch" && <PreviewDispatch />}
        {key === "deliveries" && <PreviewDeliveries />}
        {key === "availability" && <PreviewAvailability />}
        {key === "forms" && <PreviewForms />}
        {(key === "inventory" || key === "events" || key === "assistance" || key === "partners" || key === "assets") && <PreviewNewArea type={key}/>}
        {key === "messages" && <div className={styles.newArea}><div className={styles.newAreaRow}><span className={styles.newAreaIcon}><MessageSquare size={13}/></span><span className={styles.newAreaTitle}># Equipe</span><span className={styles.newAreaBar}/></div><div className={styles.newAreaRow}><span className={styles.newAreaIcon}><UsersRound size={13}/></span><span className={styles.newAreaTitle}>Atualizações</span><span className={styles.newAreaBar}/></div><div className={styles.newAreaRow}><span className={styles.newAreaIcon}><MessageSquare size={13}/></span><span className={styles.newAreaTitle}>Conversas</span></div></div>}
        {key === "reservations" && <div className={styles.newArea}><div className={styles.newAreaRow}><span className={styles.newAreaIcon}><BookOpen size={13}/></span><span className={styles.newAreaTitle}>Sala de reunião</span><span className={styles.newAreaBar}/></div><div className={styles.newAreaRow}><span className={styles.newAreaIcon}><CalendarDays size={13}/></span><span className={styles.newAreaTitle}>Agenda de uso</span><span className={styles.newAreaBar}/></div><div className={styles.newAreaRow}><span className={styles.newAreaIcon}><Clock3 size={13}/></span><span className={styles.newAreaTitle}>Horários</span></div></div>}
        {!key && <PreviewGeneric />}
      </div>
    </div>
  );
}
