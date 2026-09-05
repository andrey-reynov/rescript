import {runtimeMessageKeys} from './runtimeMessages';
import {ru} from './messages/ru';
import type {UiLocale} from './locales';
/** Copy added by the fork. Other locales retain English until translated. */
export const forkRussian={
 'Experimental':'Экспериментальная','English only':'Только английский','Multilingual':'Несколько языков','English only. Use a multilingual model for Russian.':'Только английский. Для русского выберите многоязычную модель.','This model supports English only. Choose a multilingual model for Russian.':'Эта модель поддерживает только английский. Для русского выберите многоязычную модель.',
 'The latest project changes could not be saved.':'Не удалось сохранить последние изменения проекта.','The editor did not acknowledge its last save.':'Редактор не подтвердил последнее сохранение.','Keep working':'Продолжить работу','Quit without saving':'Выйти без сохранения',
"Independent fork based on the original ReScript app by Wassim Gharbi and contributors. Not affiliated with or endorsed by the original project.":"Независимый форк оригинального приложения ReScript, созданного Wassim Gharbi и участниками проекта. Не связан с оригинальным проектом и не одобрен его авторами.",
"Open project":"Открыть проект",
"Save Project As":"Сохранить проект как",
"Rescript project":"Проект Rescript",
"Locate original media for browser project: ":"Укажите исходник проекта из браузера: ",
"Locate original source: ":"Укажите исходный файл: ",
"The editor stopped responding.":"Редактор перестал отвечать.",
"Saved projects remain on disk. Reload to recover your last save or choose a snapshot from the library.":"Сохранённые проекты остаются на диске. Перезагрузите редактор для восстановления последнего сохранения или выберите снимок в библиотеке.",
"Reload":"Перезагрузить",
"Close":"Закрыть",
"This Whisper model does not support language detection.":"Эта модель Whisper не поддерживает определение языка.",
"Language detection returned no tokens.":"Не удалось получить результат определения языка.",
"The spoken language could not be identified.":"Не удалось определить язык речи.",
 'Timeline':'Таймлайн','Retry':'Повторить','Find in transcript (Ctrl+F)':'Найти в расшифровке (Ctrl+F)','Find in transcript':'Найти в расшифровке','Search transcript':'Поиск в расшифровке','Find words or a phrase…':'Слова или фраза…','Previous match':'Предыдущее совпадение','Go to match':'Перейти к совпадению','Next match':'Следующее совпадение','Close search':'Закрыть поиск','No matches':'Нет совпадений',
 'Transcribing in saved batches':'Пакетная расшифровка','Transcription complete':'Расшифровка завершена','Audio ready':'Аудио готово',

 'Settings':'Настройки','Close settings':'Закрыть настройки','Settings sections':'Разделы настроек','projects':'Проекты','appearance':'Оформление','about':'О приложении',
 'Default project folder':'Папка новых проектов','New projects save here automatically. Save As lets you save a separate version elsewhere. Changing this folder does not move your existing projects.':'Новые проекты сохраняются здесь автоматически. «Сохранить как…» создаёт отдельную версию в другой папке. Существующие проекты при смене папки не перемещаются.',
 'Browser storage — install the desktop app to choose a folder.':'Хранилище браузера. Для выбора папки установите приложение.',
 'Choose folder…':'Выбрать папку…','Original media stays where it is. Projects keep source references and saved edits, plus up to 20 recovery snapshots.':'Исходные медиафайлы остаются на месте. Проект хранит ссылки на них, правки и до 20 снимков для восстановления.',
 'Appearance':'Оформление','Interface language':'Язык интерфейса','Fork on GitHub':'Форк на GitHub','Project name':'Имя проекта','Saved':'Сохранено','Saving…':'Сохранение…','Save failed':'Ошибка сохранения','Unsaved changes · autosave within 0.5s':'Есть правки · автосохранение за 0,5 с','Pause processing':'Приостановить','Resume processing':'Продолжить','Retranscribe selected batches':'Перераспознать выбранные блоки','Replace transcription in the one-minute batches containing the selected words. Other batches and manual timeline cuts stay unchanged.':'Заново распознать минутные блоки с выбранными словами. Остальные блоки и ручной монтаж сохраняются.',
 'Save':'Сохранить','Save As…':'Сохранить как…','Show project location':'Показать папку проекта','Your work is still open; retry saving before closing.':'Проект остаётся открытым. Перед закрытием повторите сохранение.',
 'Project library':'Проекты','Your projects':'Ваши проекты','{count} saved · newest first':'Сохранено: {count} · сначала новые','Open {name}':'Открыть {name}','Opening…':'Открытие…','Project needs recovery':'Требуется восстановление','Updated {date}':'Обновлён {date}','Older project · locate original media to migrate':'Старый проект · укажите исходник для переноса','Browser storage':'Хранилище браузера','Recovery snapshots':'Снимки восстановления','Recovery snapshots for {name}':'Снимки проекта {name}','Restore a prior saved revision. The current file is retained as a recovery backup.':'Восстановить предыдущую версию. Текущий файл будет сохранён как резервная копия.','No snapshots yet. Snapshots appear after subsequent saves.':'Снимков пока нет. Они появятся после следующих сохранений.','Restore {revision}':'Восстановить {revision}','latest previous revision':'последнюю предыдущую версию','revision {number}':'версию {number}','Cancel':'Отмена','Open project…':'Открыть проект…',
 'New project from media…':'Новый проект из медиа…','Save project':'Сохранить проект','Save project as…':'Сохранить проект как…','Close Project':'Закрыть проект',
 'Audio Export Mode':'Режим аудиоэкспорта','Stereo':'Стерео','Discrete Channels':'Отдельные каналы','Preserve Source Layout':'Как в исходнике','Inspecting audio':'Анализ аудио','Video only':'Только видео','{layout} · {count} channels':'{layout} · каналов: {count}',
 'Imports into Resolve as linked source audio and video (FCPXML).':'Импортируется в Resolve как связанные исходные аудио и видео (FCPXML).',
 'Reading media':'Чтение медиа','Preparing audio':'Подготовка аудио','Restarting decoder':'Перезапуск декодера','Loading waveform':'Загрузка волны','Reading audio':'Чтение аудио','Preparing waveform':'Подготовка волны','Working…':'Обработка…','Idle {seconds}s':'Без обновлений: {seconds} с','Resuming completed checkpoints':'Продолжение расшифровки','Transcribing':'Расшифровка','Complete':'Готово','Paused':'Приостановлено',
 'Automatic':'Автоматически','Detecting language':'Определение языка','Parakeet detects language automatically. Use Whisper to force a specific language.':'Parakeet определяет язык автоматически. Для выбора конкретного языка используйте Whisper.',
 'AAF requires two discrete channels. Choose Discrete Channels or another editor.':'AAF требует два отдельных канала. Выберите «Отдельные каналы» или другой редактор.',
 'Choose Discrete Channels to preserve every channel in Premiere XML.':'Для сохранения всех каналов в Premiere XML выберите «Отдельные каналы».',
 'NLE export of multiple audio streams is not supported yet. No channels have been changed. Multi-track support is planned.':'Экспорт нескольких отдельных аудиопотоков пока не поддерживается. Исходные каналы сохранены. Поддержка нескольких дорожек запланирована.',
 'Stereo requires one two-channel source stream. Choose Discrete Channels or Preserve Source Layout.':'Для стерео нужен один двухканальный аудиопоток. Выберите «Отдельные каналы» или «Как в исходнике».',
 'This source is exported as ordered discrete channels. Its unspecified speaker layout cannot be preserved by this exporter.':'Каналы экспортируются отдельно в исходном порядке, поскольку схема расположения динамиков неизвестна.',
 'The source audio channel layout could not be read.':'Не удалось прочитать схему аудиоканалов.','Could not inspect the source audio.':'Не удалось проанализировать исходное аудио.','The source has no audio streams.':'В исходнике нет аудио.','Invalid source audio metadata.':'Некорректные сведения об аудио.',
 'Project action failed.':'Не удалось выполнить действие с проектом.','Audio inspection failed.':'Ошибка анализа аудио.'
} as const;
export function forkText(locale:UiLocale,text:string,params:Record<string,string|number>={}):string{
 if(locale==='ru'){
   const batch=/^Batch (\d+)\/(\d+) · (.*)$/.exec(text);
   if(batch)return 'Блок '+batch[1]+'/'+batch[2]+' · '+forkText(locale,batch[3],params);
   const runtime=runtimeMessageKeys[text];if(runtime)return ru[runtime];
 }
 const template=locale==='ru'?(forkRussian[text as keyof typeof forkRussian]??text):text;
 return template.replace(/\{(\w+)\}/g,(token,name)=>Object.hasOwn(params,name)?String(params[name]):token);
}
