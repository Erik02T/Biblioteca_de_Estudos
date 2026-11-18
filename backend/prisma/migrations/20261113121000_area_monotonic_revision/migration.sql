-- Keep the existing millisecond updatedAt wire contract reliable for every writer,
-- including favorite/trash/reorder operations issued within the same millisecond.
CREATE FUNCTION "advance_area_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" := GREATEST(
    NEW."updatedAt",
    date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC'),
    OLD."updatedAt" + INTERVAL '1 millisecond'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Area_monotonic_updatedAt"
BEFORE UPDATE ON "Area"
FOR EACH ROW EXECUTE FUNCTION "advance_area_updated_at"();
