CREATE OR REPLACE FUNCTION public.notify_tasks_update()
RETURNS trigger AS $$
DECLARE
	row RECORD;
 
	BEGIN
      IF (TG_OP = 'DELETE') THEN
        row = OLD;
      ELSE
        row = NEW;
      END IF;
        
      PERFORM pg_notify(CAST('tasks_watcher' AS text), json_build_object('task', row.*, 'operation', TG_OP)::text);
  	  RETURN NULL;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_update
AFTER UPDATE OR INSERT OR DELETE ON public.tasks
FOR EACH ROW EXECUTE PROCEDURE public.notify_tasks_update();



CREATE OR REPLACE FUNCTION public.notify_assignee_update()
RETURNS trigger AS $$
DECLARE
	row RECORD;
 
	BEGIN
      IF (TG_OP = 'DELETE') THEN
        row = OLD;
      ELSE
        row = NEW;
      END IF;
        
      PERFORM pg_notify(CAST('assignee_watcher' AS text), json_build_object('task_assignee', row.*, 'operation', TG_OP)::text);
  	  RETURN NULL;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignee_watcher
AFTER UPDATE OR INSERT OR DELETE ON public.group_user_tasks
FOR EACH ROW EXECUTE PROCEDURE public.notify_assignee_update();