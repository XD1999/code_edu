import sys
import json


def visualize(data_path):
    try:
        import matplotlib.pyplot as plt
        HAS_MATPLOTLIB = True
    except ImportError:
        HAS_MATPLOTLIB = False

    with open(data_path, 'r') as f:
        data = json.load(f)

    if HAS_MATPLOTLIB:
        # Graphical visualization
        if 'terms' in data:
            terms = [t['term'] for t in data['terms']]
            lengths = [len(t['explanation']) for t in data['terms']]

            if not terms:
                print("No child terms to visualize in this branch.")
                return

            plt.figure(figsize=(10, 6))
            plt.bar(terms, lengths)
            plt.title(
                f"Complexity analysis for: {data.get('term', 'Unknown')}")
            plt.xlabel('Sub-Term')
            plt.ylabel('Explanation Length (chars)')
            plt.xticks(rotation=45)
            plt.tight_layout()
            plt.show()
        else:
            print("No terms found in data.")
    else:
        # Fallback text visualization
        print("-" * 40)
        print(f"VISUALIZATION: {data.get('term', 'Unknown')}")
        print("-" * 40)
        print("Note: Install 'matplotlib' for graphical charts.\n")

        if 'terms' in data and data['terms']:
            max_len = max(len(t['explanation']) for t in data['terms'])
            for t in data['terms']:
                bar_len = int((len(t['explanation']) / max_len)
                              * 30) if max_len > 0 else 0
                print(
                    f"{t['term']:<15} | {'#' * bar_len} ({len(t['explanation'])} chars)")
        else:
            print("No child terms found.")
        print("-" * 40)
        input("\nPress Enter to close...")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        visualize(sys.argv[1])
    else:
        print("Usage: python visualizer.py <data_json_path>")
