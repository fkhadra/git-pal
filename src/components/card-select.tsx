import { ReactElement } from "react";

interface Option {
  value: string;
  label: string;
  Icon: ReactElement;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  legend: string;
  options: Option[];
}

export function CardSelect(props: Props) {
  return (
    <fieldset>
      <legend className="sr-only">{props.legend}</legend>

      <div className="grid grid-cols-3 gap-4">
        {props.options.map((option) => (
          <label
            key={option.value}
            htmlFor={option.value}
            className="cursor-pointer rounded-md border-2 border-gray-300 bg-background p-4 hover:border-slate-400 has-checked:border-primary has-checked:bg-primary/15 hover:has-checked:border-primary dark:border-gray-500 dark:bg-input dark:hover:border-slate-50"
          >
            <input
              type="radio"
              className="peer absolute appearance-none"
              id={option.value}
              value={option.value}
              onChange={(e) => {
                if (e.target.checked) {
                  props.onChange(option.value);
                }
              }}
              checked={props.value === option.value}
            />
            <div className="flex flex-col items-center gap-2 text-center capitalize peer-checked:text-primary">
              {option.Icon}
              <span>{option.label}</span>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
